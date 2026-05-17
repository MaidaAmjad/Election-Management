-- =============================================================================
-- In-app notifications, email logs, scheduled election emails
-- =============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  election_id uuid references public.elections (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_user_read_idx on public.notifications (user_id, is_read);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  recipient_email text not null,
  subject text not null,
  status text not null default 'Pending'
    constraint email_logs_status_check check (status in ('Pending', 'Sent', 'Failed')),
  error_message text,
  notification_type text,
  election_id uuid references public.elections (id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_logs_recipient_idx on public.email_logs (recipient_email);
create index if not exists email_logs_status_idx on public.email_logs (status);
create index if not exists email_logs_created_at_idx on public.email_logs (created_at desc);

create table if not exists public.email_schedules (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  schedule_type text not null
    constraint email_schedules_type_check check (
      schedule_type in (
        'reminder_24h',
        'reminder_1h',
        'election_end',
        'winner_announcement'
      )
    ),
  scheduled_for timestamptz not null,
  status text not null default 'pending'
    constraint email_schedules_status_check check (
      status in ('pending', 'sent', 'failed', 'cancelled')
    ),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint email_schedules_unique unique (election_id, schedule_type)
);

create index if not exists email_schedules_due_idx
  on public.email_schedules (scheduled_for)
  where status = 'pending';

alter table public.email_verification_codes
  drop constraint if exists email_verification_codes_purpose_check;

alter table public.email_verification_codes
  add constraint email_verification_codes_purpose_check check (
    purpose in ('mfa', 'password_reset', 'signup_verify')
  );

alter table public.notifications enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_schedules enable row level security;

-- ---------------------------------------------------------------------------
-- In-app notifications
-- ---------------------------------------------------------------------------

create or replace function public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_election_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, title, message, type, election_id, metadata)
  values (p_user_id, p_title, p_message, p_type, p_election_id, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_my_notifications(
  p_limit integer default 50,
  p_offset integer default 0,
  p_unread_only boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t) order by t.created_at desc)
      from (
        select
          n.id,
          n.title,
          n.message,
          n.type,
          n.is_read,
          n.election_id,
          n.metadata,
          n.created_at,
          e.title as election_title
        from public.notifications n
        left join public.elections e on e.id = n.election_id
        where n.user_id = auth.uid()
          and (not p_unread_only or n.is_read = false)
        order by n.created_at desc
        limit greatest(p_limit, 1)
        offset greatest(p_offset, 0)
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.notifications
  where user_id = auth.uid() and is_read = false;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_read = true
  where id = p_notification_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.notifications
  set is_read = true
  where user_id = auth.uid() and is_read = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.delete_notification(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where id = p_notification_id and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.search_notifications(
  p_search text default null,
  p_type text default null,
  p_read_filter text default 'all',
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total bigint;
  v_rows jsonb;
  v_offset integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  v_offset := greatest(0, (greatest(p_page, 1) - 1) * greatest(p_page_size, 1));

  select count(*) into v_total
  from public.notifications n
  where n.user_id = auth.uid()
    and (p_type is null or p_type = '' or p_type = 'all' or n.type = p_type)
    and (
      p_read_filter = 'all'
      or (p_read_filter = 'read' and n.is_read)
      or (p_read_filter = 'unread' and not n.is_read)
    )
    and (
      p_search is null
      or trim(p_search) = ''
      or n.title ilike '%' || trim(p_search) || '%'
      or n.message ilike '%' || trim(p_search) || '%'
    );

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      n.*,
      e.title as election_title,
      el.status as email_delivery_status,
      el.sent_at as email_sent_at
    from public.notifications n
    left join public.elections e on e.id = n.election_id
    left join lateral (
      select status, sent_at
      from public.email_logs el2
      where el2.user_id = n.user_id
        and el2.notification_type = n.type
        and (n.election_id is null or el2.election_id = n.election_id)
      order by el2.created_at desc
      limit 1
    ) el on true
    where n.user_id = auth.uid()
      and (p_type is null or p_type = '' or p_type = 'all' or n.type = p_type)
      and (
        p_read_filter = 'all'
        or (p_read_filter = 'read' and n.is_read)
        or (p_read_filter = 'unread' and not n.is_read)
      )
      and (
        p_search is null
        or trim(p_search) = ''
        or n.title ilike '%' || trim(p_search) || '%'
        or n.message ilike '%' || trim(p_search) || '%'
      )
    order by n.created_at desc
    limit greatest(p_page_size, 1)
    offset v_offset
  ) t;

  return jsonb_build_object(
    'success',
    true,
    'total',
    v_total,
    'page',
    greatest(p_page, 1),
    'rows',
    v_rows
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Email schedules for elections
-- ---------------------------------------------------------------------------

create or replace function public.schedule_election_email_reminders(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found or v_election.status = 'Draft' then
    return;
  end if;

  insert into public.email_schedules (election_id, schedule_type, scheduled_for)
  values
    (p_election_id, 'reminder_24h', v_election.start_datetime - interval '24 hours'),
    (p_election_id, 'reminder_1h', v_election.start_datetime - interval '1 hour'),
    (p_election_id, 'election_end', v_election.end_datetime)
  on conflict (election_id, schedule_type)
  do update set
    scheduled_for = excluded.scheduled_for,
    status = case
      when public.email_schedules.status = 'sent' then 'sent'
      else 'pending'
    end;

  insert into public.email_schedules (election_id, schedule_type, scheduled_for)
  values (p_election_id, 'winner_announcement', v_election.end_datetime + interval '5 minutes')
  on conflict (election_id, schedule_type) do nothing;
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, uuid, jsonb) to authenticated, service_role;
grant execute on function public.get_my_notifications(integer, integer, boolean) to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.delete_notification(uuid) to authenticated;
grant execute on function public.search_notifications(text, text, text, integer, integer) to authenticated;
grant execute on function public.schedule_election_email_reminders(uuid) to authenticated, service_role;

create or replace function public.queue_winner_notification(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.email_schedules
  set scheduled_for = now(), status = 'pending'
  where election_id = p_election_id
    and schedule_type = 'winner_announcement'
    and status in ('pending', 'failed');
end;
$$;

grant execute on function public.queue_winner_notification(uuid) to authenticated, service_role;

-- RLS
drop policy if exists "Users view own notifications" on public.notifications;
create policy "Users view own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Service insert notifications" on public.notifications;
create policy "Service insert notifications"
  on public.notifications for insert to authenticated
  with check (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "Super Admin manage all notifications" on public.notifications;
create policy "Super Admin manage all notifications"
  on public.notifications for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Users view own email logs" on public.email_logs;
create policy "Users view own email logs"
  on public.email_logs for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "Super Admin view all email logs" on public.email_logs;
create policy "Super Admin view all email logs"
  on public.email_logs for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Super Admin view schedules" on public.email_schedules;
create policy "Super Admin view schedules"
  on public.email_schedules for select to authenticated
  using (public.is_super_admin());

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
