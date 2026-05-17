-- =============================================================================
-- Secret voting IDs (post-finalization) + audit logs
-- =============================================================================

create table if not exists public.secret_ids (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references auth.users (id) on delete cascade,
  election_id uuid not null references public.elections (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  secret_id text not null,
  is_active boolean not null default true,
  email_status text not null default 'Pending'
    constraint secret_ids_email_status_check check (
      email_status in ('Pending', 'Sent', 'Failed')
    ),
  generated_at timestamptz not null default now(),
  constraint secret_ids_secret_id_unique unique (secret_id)
);

create unique index if not exists secret_ids_active_voter_poll_unique
  on public.secret_ids (voter_id, poll_id)
  where is_active = true;

create index if not exists secret_ids_election_id_idx on public.secret_ids (election_id);
create index if not exists secret_ids_poll_id_idx on public.secret_ids (poll_id);
create index if not exists secret_ids_voter_id_idx on public.secret_ids (voter_id);

create table if not exists public.secret_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  election_id uuid references public.elections (id) on delete cascade,
  poll_id uuid references public.polls (id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists secret_logs_election_id_idx on public.secret_logs (election_id);
create index if not exists secret_logs_created_at_idx on public.secret_logs (created_at desc);

alter table public.secret_ids enable row level security;
alter table public.secret_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.mask_secret_id(p_secret_id text)
returns text
language sql
immutable
as $$
  select '****' || right(p_secret_id, 4);
$$;

create or replace function public.can_manage_secret_ids(p_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or public.is_election_creator(p_election_id);
$$;

create or replace function public.insert_secret_log(
  p_user_id uuid,
  p_election_id uuid,
  p_poll_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.secret_logs (user_id, election_id, poll_id, action)
  values (p_user_id, p_election_id, p_poll_id, p_action);
end;
$$;

create or replace function public.poll_letter_from_index(p_index integer)
returns text
language plpgsql
immutable
as $$
begin
  if p_index < 0 or p_index > 25 then
    return chr(65 + (p_index % 26));
  end if;
  return chr(65 + p_index);
end;
$$;

-- ---------------------------------------------------------------------------
-- Generate secret IDs for all finalized voters × polls
-- ---------------------------------------------------------------------------

create or replace function public.generate_secret_ids_for_election(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_poll record;
  v_voter record;
  v_poll_index integer := 0;
  v_seq integer;
  v_letter text;
  v_new_id text;
  v_generated integer := 0;
  v_polls_count integer := 0;
begin
  if not public.can_manage_secret_ids(p_election_id) then
    return jsonb_build_object('success', false, 'message', 'Access denied.');
  end if;

  select * into v_election from public.elections where id = p_election_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_election.registration_status is distinct from 'Finalized' then
    return jsonb_build_object(
      'success', false,
      'message', 'Secret IDs can only be generated after the voter list is finalized.'
    );
  end if;

  if exists (
    select 1 from public.secret_ids s
    where s.election_id = p_election_id and s.is_active = true
  ) then
    return jsonb_build_object(
      'success', false,
      'message', 'Secret IDs already exist for this election. Regenerate individual IDs from the management dashboard if needed.'
    );
  end if;

  for v_poll in
    select p.id, p.title
    from public.polls p
    where p.election_id = p_election_id
    order by p.created_at asc, p.id asc
  loop
    v_polls_count := v_polls_count + 1;
    v_letter := public.poll_letter_from_index(v_poll_index);
    v_seq := 0;
    v_poll_index := v_poll_index + 1;

    for v_voter in
      select vr.voter_id
      from public.voter_registrations vr
      where vr.election_id = p_election_id
        and vr.status in ('Registered', 'Approved')
      order by vr.registered_at asc
    loop
      v_seq := v_seq + 1;
      v_new_id := format('POLL-%s-%s', v_letter, lpad(v_seq::text, 4, '0'));

      while exists (select 1 from public.secret_ids where secret_id = v_new_id) loop
        v_seq := v_seq + 1;
        v_new_id := format('POLL-%s-%s', v_letter, lpad(v_seq::text, 4, '0'));
      end loop;

      insert into public.secret_ids (
        voter_id,
        election_id,
        poll_id,
        secret_id,
        email_status
      )
      values (
        v_voter.voter_id,
        p_election_id,
        v_poll.id,
        v_new_id,
        'Pending'
      );

      v_generated := v_generated + 1;
    end loop;
  end loop;

  perform public.insert_secret_log(
    auth.uid(),
    p_election_id,
    null,
    format('Secret ID generated (%s IDs)', v_generated)
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Secret IDs generated successfully',
    'generated_count', v_generated,
    'polls_count', v_polls_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Regenerate (Super Admin only)
-- ---------------------------------------------------------------------------

create or replace function public.regenerate_secret_id(p_secret_row_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.secret_ids%rowtype;
  v_poll_index integer;
  v_letter text;
  v_seq integer;
  v_new_id text;
  v_new_row_id uuid;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin access required.');
  end if;

  select * into v_row
  from public.secret_ids
  where id = p_secret_row_id and is_active = true;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Active secret ID not found.');
  end if;

  update public.secret_ids
  set is_active = false
  where id = p_secret_row_id;

  select rn - 1 into v_poll_index
  from (
    select id, row_number() over (order by created_at asc, id asc) as rn
    from public.polls
    where election_id = v_row.election_id
  ) ordered
  where id = v_row.poll_id;

  v_poll_index := coalesce(v_poll_index, 0);

  select count(*) + 1 into v_seq
  from public.secret_ids s
  where s.poll_id = v_row.poll_id;

  v_letter := public.poll_letter_from_index(greatest(v_poll_index, 0));
  v_new_id := format('POLL-%s-%s', v_letter, lpad(v_seq::text, 4, '0'));

  while exists (select 1 from public.secret_ids where secret_id = v_new_id) loop
    v_seq := v_seq + 1;
    v_new_id := format('POLL-%s-%s', v_letter, lpad(v_seq::text, 4, '0'));
  end loop;

  insert into public.secret_ids (
    voter_id,
    election_id,
    poll_id,
    secret_id,
    email_status
  )
  values (
    v_row.voter_id,
    v_row.election_id,
    v_row.poll_id,
    v_new_id,
    'Pending'
  )
  returning id into v_new_row_id;

  perform public.insert_secret_log(
    auth.uid(),
    v_row.election_id,
    v_row.poll_id,
    'ID regenerated'
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Secret ID regenerated. Previous ID invalidated.',
    'new_row_id', v_new_row_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Masked reads (never return full secret_id to client)
-- ---------------------------------------------------------------------------

create or replace function public.get_masked_secret_ids_for_election(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.can_manage_secret_ids(p_election_id)
    and not public.is_super_admin() then
    if not exists (
      select 1 from public.secret_ids s
      where s.election_id = p_election_id and s.voter_id = auth.uid()
    ) then
      raise exception 'Access denied';
    end if;
  end if;

  select coalesce(jsonb_agg(row_to_json(t) order by t.generated_at desc), '[]'::jsonb)
  into v_result
  from (
    select
      s.id,
      s.voter_id,
      s.election_id,
      s.poll_id,
      public.mask_secret_id(s.secret_id) as masked_secret_id,
      s.email_status,
      s.is_active,
      s.generated_at,
      coalesce(p.full_name, 'Unknown') as voter_name,
      coalesce(u.email::text, '') as email,
      pl.title as poll_title
    from public.secret_ids s
    join public.polls pl on pl.id = s.poll_id
    left join public.profiles p on p.id = s.voter_id
    left join auth.users u on u.id = s.voter_id
    where s.election_id = p_election_id
      and s.is_active = true
      and (
        public.can_manage_secret_ids(p_election_id)
        or s.voter_id = auth.uid()
      )
  ) t;

  return v_result;
end;
$$;

create or replace function public.get_my_masked_secret_ids()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  return (
    select coalesce(jsonb_agg(row_to_json(t) order by t.generated_at desc), '[]'::jsonb)
    from (
      select
        s.id,
        s.election_id,
        s.poll_id,
        public.mask_secret_id(s.secret_id) as masked_secret_id,
        s.email_status,
        s.generated_at,
        e.title as election_title,
        pl.title as poll_title
      from public.secret_ids s
      join public.elections e on e.id = s.election_id
      join public.polls pl on pl.id = s.poll_id
      where s.voter_id = auth.uid()
        and s.is_active = true
    ) t
  );
end;
$$;

create or replace function public.get_secret_logs_for_election(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_secret_ids(p_election_id) then
    raise exception 'Access denied';
  end if;

  return (
    select coalesce(jsonb_agg(row_to_json(t) order by t.created_at desc), '[]'::jsonb)
    from (
      select
        l.id,
        l.user_id,
        l.election_id,
        l.poll_id,
        l.action,
        l.created_at,
        coalesce(pr.full_name, 'System') as user_name
      from public.secret_logs l
      left join public.profiles pr on pr.id = l.user_id
      where l.election_id = p_election_id
      limit 500
    ) t
  );
end;
$$;

-- Update email status (edge function / RPC)
create or replace function public.update_secret_id_email_status(
  p_secret_row_id uuid,
  p_status text,
  p_log_action text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.secret_ids%rowtype;
begin
  update public.secret_ids
  set email_status = p_status
  where id = p_secret_row_id
  returning * into v_row;

  if p_log_action is not null and v_row.id is not null then
    perform public.insert_secret_log(
      null,
      v_row.election_id,
      v_row.poll_id,
      p_log_action
    );
  end if;
end;
$$;

grant execute on function public.generate_secret_ids_for_election(uuid) to authenticated;
grant execute on function public.regenerate_secret_id(uuid) to authenticated;
grant execute on function public.get_masked_secret_ids_for_election(uuid) to authenticated;
grant execute on function public.get_my_masked_secret_ids() to authenticated;
grant execute on function public.get_secret_logs_for_election(uuid) to authenticated;
grant execute on function public.update_secret_id_email_status(uuid, text, text) to authenticated;
grant execute on function public.mask_secret_id(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

drop policy if exists "Managers view secret ids for elections" on public.secret_ids;
create policy "Managers view secret ids for elections"
  on public.secret_ids for select to authenticated
  using (
    public.is_super_admin()
    or public.is_election_creator(election_id)
    or voter_id = auth.uid()
  );

drop policy if exists "Managers view secret logs" on public.secret_logs;
create policy "Managers view secret logs"
  on public.secret_logs for select to authenticated
  using (
    public.is_super_admin()
    or public.is_election_creator(election_id)
  );

drop policy if exists "Managers insert secret logs" on public.secret_logs;
create policy "Managers insert secret logs"
  on public.secret_logs for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.is_super_admin()
      or public.is_election_creator(election_id)
      or exists (
        select 1 from public.secret_ids s
        where s.election_id = secret_logs.election_id
          and s.voter_id = auth.uid()
      )
    )
  );
