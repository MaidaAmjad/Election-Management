-- =============================================================================
-- Audit & transparency: audit_logs + override_logs
-- =============================================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_name text not null default 'System',
  role text not null default 'System',
  action_type text not null,
  module_name text not null,
  description text not null default '',
  election_id uuid references public.elections (id) on delete set null,
  poll_id uuid references public.polls (id) on delete set null,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id);
create index if not exists audit_logs_action_type_idx on public.audit_logs (action_type);
create index if not exists audit_logs_module_name_idx on public.audit_logs (module_name);
create index if not exists audit_logs_election_id_idx on public.audit_logs (election_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

create table if not exists public.override_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users (id) on delete cascade,
  admin_name text,
  election_id uuid references public.elections (id) on delete set null,
  action text not null,
  previous_value text,
  new_value text,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists override_logs_admin_id_idx on public.override_logs (admin_id);
create index if not exists override_logs_election_id_idx on public.override_logs (election_id);
create index if not exists override_logs_created_at_idx on public.override_logs (created_at desc);

alter table public.audit_logs enable row level security;
alter table public.override_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Central audit insert
-- ---------------------------------------------------------------------------

create or replace function public.insert_audit_log(
  p_action_type text,
  p_module_name text,
  p_description text,
  p_election_id uuid default null,
  p_poll_id uuid default null,
  p_ip_address text default null,
  p_user_id uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := 'System';
  v_role text := 'System';
  v_log_id uuid;
begin
  if p_user_id is not null then
    select coalesce(p.full_name, 'Unknown'), coalesce(p.role, 'User')
    into v_name, v_role
    from public.profiles p
    where p.id = p_user_id;
  end if;

  insert into public.audit_logs (
    user_id,
    user_name,
    role,
    action_type,
    module_name,
    description,
    election_id,
    poll_id,
    ip_address
  )
  values (
    p_user_id,
    v_name,
    v_role,
    p_action_type,
    p_module_name,
    coalesce(p_description, ''),
    p_election_id,
    p_poll_id,
    p_ip_address
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

create or replace function public.insert_override_log(
  p_admin_id uuid,
  p_action text,
  p_previous_value text,
  p_new_value text,
  p_reason text,
  p_election_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
begin
  select coalesce(full_name, 'Unknown') into v_name
  from public.profiles where id = p_admin_id;

  insert into public.override_logs (
    admin_id,
    admin_name,
    election_id,
    action,
    previous_value,
    new_value,
    reason
  )
  values (
    p_admin_id,
    v_name,
    p_election_id,
    p_action,
    p_previous_value,
    p_new_value,
    coalesce(p_reason, '')
  )
  returning id into v_id;

  perform public.insert_audit_log(
    p_action,
    'Override',
    format('%s: %s → %s. Reason: %s', p_action, coalesce(p_previous_value, '—'), coalesce(p_new_value, '—'), coalesce(p_reason, '')),
    p_election_id,
    null,
    null,
    p_admin_id
  );

  return v_id;
end;
$$;

-- Bridge voter lock logs → override_logs + audit
create or replace function public.insert_voter_lock_log(
  p_admin_id uuid,
  p_election_id uuid,
  p_action_type text,
  p_previous_value text,
  p_new_value text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.voter_lock_logs (
    admin_id,
    election_id,
    action_type,
    previous_value,
    new_value,
    reason
  )
  values (
    p_admin_id,
    p_election_id,
    p_action_type,
    p_previous_value,
    p_new_value,
    p_reason
  );

  perform public.insert_override_log(
    p_admin_id,
    p_action_type,
    p_previous_value,
    p_new_value,
    p_reason,
    p_election_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Query helpers with role-based scope
-- ---------------------------------------------------------------------------

create or replace function public.can_export_audit_logs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin();
$$;

create or replace function public.get_audit_logs(
  p_search text default null,
  p_role text default null,
  p_module text default null,
  p_action_type text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_page integer default 1,
  p_page_size integer default 20,
  p_election_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_offset integer;
  v_total bigint;
  v_rows jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  v_is_admin := public.is_super_admin();
  v_offset := greatest(0, (greatest(p_page, 1) - 1) * greatest(p_page_size, 1));

  select count(*) into v_total
  from public.audit_logs al
  where (
    v_is_admin
    or al.user_id = v_user_id
    or (
      public.is_election_creator(al.election_id)
      and al.election_id is not null
    )
  )
  and (p_election_id is null or al.election_id = p_election_id)
  and (p_role is null or p_role = '' or al.role = p_role)
  and (p_module is null or p_module = '' or al.module_name = p_module)
  and (p_action_type is null or p_action_type = '' or al.action_type = p_action_type)
  and (p_date_from is null or al.created_at >= p_date_from)
  and (p_date_to is null or al.created_at <= p_date_to)
  and (
    p_search is null
    or trim(p_search) = ''
    or al.description ilike '%' || trim(p_search) || '%'
    or al.action_type ilike '%' || trim(p_search) || '%'
    or al.user_name ilike '%' || trim(p_search) || '%'
    or al.module_name ilike '%' || trim(p_search) || '%'
    or al.id::text ilike '%' || trim(p_search) || '%'
  );

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      al.id,
      al.user_id,
      al.user_name,
      al.role,
      al.action_type,
      al.module_name,
      al.description,
      al.election_id,
      al.poll_id,
      al.ip_address,
      al.created_at,
      e.title as election_title
    from public.audit_logs al
    left join public.elections e on e.id = al.election_id
    where (
      v_is_admin
      or al.user_id = v_user_id
      or (
        al.election_id is not null
        and exists (
          select 1 from public.elections ex
          where ex.id = al.election_id and ex.creator_id = v_user_id
        )
      )
    )
    and (p_election_id is null or al.election_id = p_election_id)
    and (p_role is null or p_role = '' or al.role = p_role)
    and (p_module is null or p_module = '' or al.module_name = p_module)
    and (p_action_type is null or p_action_type = '' or al.action_type = p_action_type)
    and (p_date_from is null or al.created_at >= p_date_from)
    and (p_date_to is null or al.created_at <= p_date_to)
    and (
      p_search is null
      or trim(p_search) = ''
      or al.description ilike '%' || trim(p_search) || '%'
      or al.action_type ilike '%' || trim(p_search) || '%'
      or al.user_name ilike '%' || trim(p_search) || '%'
      or al.module_name ilike '%' || trim(p_search) || '%'
      or al.id::text ilike '%' || trim(p_search) || '%'
    )
    order by al.created_at desc
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
    'page_size',
    greatest(p_page_size, 1),
    'rows',
    v_rows
  );
end;
$$;

create or replace function public.get_override_logs(
  p_election_id uuid default null,
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
  v_user_id uuid := auth.uid();
  v_offset integer;
  v_total bigint;
  v_rows jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Access denied.');
  end if;

  v_offset := greatest(0, (greatest(p_page, 1) - 1) * greatest(p_page_size, 1));

  select count(*) into v_total
  from public.override_logs ol
  where p_election_id is null or ol.election_id = p_election_id;

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      ol.*,
      e.title as election_title
    from public.override_logs ol
    left join public.elections e on e.id = ol.election_id
    where p_election_id is null or ol.election_id = p_election_id
    order by ol.created_at desc
    limit greatest(p_page_size, 1)
    offset v_offset
  ) t;

  return jsonb_build_object(
    'success',
    true,
    'total',
    v_total,
    'rows',
    v_rows
  );
end;
$$;

create or replace function public.get_audit_dashboard_stats(
  p_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  v_scope_filter text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  v_is_admin := public.is_super_admin();

  return jsonb_build_object(
    'success',
    true,
    'total_logs',
    (
      select count(*)::integer
      from public.audit_logs al
      where (
        v_is_admin
        or al.user_id = v_user_id
        or (
          al.election_id is not null
          and exists (
            select 1 from public.elections ex
            where ex.id = al.election_id and ex.creator_id = v_user_id
          )
        )
      )
    ),
    'login_activities',
    (
      select count(*)::integer
      from public.audit_logs al
      where al.module_name = 'Authentication'
        and al.action_type ilike '%login%'
        and (
          v_is_admin
          or al.user_id = v_user_id
          or (
            al.election_id is not null
            and exists (
              select 1 from public.elections ex
              where ex.id = al.election_id and ex.creator_id = v_user_id
            )
          )
        )
    ),
    'total_votes_cast',
    (
      select count(*)::integer
      from public.votes v
      where v_is_admin
        or exists (
          select 1
          from public.polls p
          join public.elections e on e.id = p.election_id
          where p.id = v.poll_id
            and (
              e.creator_id = v_user_id
              or exists (
                select 1 from public.voter_registrations vr
                where vr.election_id = e.id and vr.voter_id = v_user_id
              )
            )
        )
    ),
    'elections_created',
    (
      select count(*)::integer
      from public.audit_logs al
      where al.action_type = 'Election created'
        and (
          v_is_admin
          or al.user_id = v_user_id
          or (
            al.election_id is not null
            and exists (
              select 1 from public.elections ex
              where ex.id = al.election_id and ex.creator_id = v_user_id
            )
          )
        )
    ),
    'approvals',
    (
      select count(*)::integer
      from public.audit_logs al
      where al.action_type ilike '%approved%'
        and (
          v_is_admin
          or al.user_id = v_user_id
        )
    ),
    'overrides',
    (
      select count(*)::integer
      from public.override_logs
      where v_is_admin
    ),
    'activity_trend',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'date',
            d.day,
            'count',
            d.cnt
          )
          order by d.day
        )
        from (
          select
            date_trunc('day', al.created_at)::date as day,
            count(*)::integer as cnt
          from public.audit_logs al
          where al.created_at >= v_since
            and (
              v_is_admin
              or al.user_id = v_user_id
              or (
                al.election_id is not null
                and exists (
                  select 1 from public.elections ex
                  where ex.id = al.election_id and ex.creator_id = v_user_id
                )
              )
            )
          group by date_trunc('day', al.created_at)::date
        ) d
      ),
      '[]'::jsonb
    ),
    'module_distribution',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', m.module_name, 'value', m.cnt)
        )
        from (
          select al.module_name, count(*)::integer as cnt
          from public.audit_logs al
          where (
            v_is_admin
            or al.user_id = v_user_id
            or (
              al.election_id is not null
              and exists (
                select 1 from public.elections ex
                where ex.id = al.election_id and ex.creator_id = v_user_id
              )
            )
          )
          group by al.module_name
          order by cnt desc
          limit 12
        ) m
      ),
      '[]'::jsonb
    ),
    'action_distribution',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', a.action_type, 'value', a.cnt)
        )
        from (
          select al.action_type, count(*)::integer as cnt
          from public.audit_logs al
          where al.created_at >= v_since
            and (
              v_is_admin
              or al.user_id = v_user_id
            )
          group by al.action_type
          order by cnt desc
          limit 15
        ) a
      ),
      '[]'::jsonb
    ),
    'user_activity',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', u.user_name, 'value', u.cnt)
        )
        from (
          select al.user_name, count(*)::integer as cnt
          from public.audit_logs al
          where al.created_at >= v_since
            and al.user_name is not null
            and (
              v_is_admin
              or al.user_id = v_user_id
            )
          group by al.user_name
          order by cnt desc
          limit 10
        ) u
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.get_audit_log_by_id(p_log_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row jsonb;
begin
  select row_to_json(t)::jsonb into v_row
  from (
    select
      al.*,
      e.title as election_title,
      p.title as poll_title
    from public.audit_logs al
    left join public.elections e on e.id = al.election_id
    left join public.polls p on p.id = al.poll_id
    where al.id = p_log_id
      and (
        public.is_super_admin()
        or al.user_id = auth.uid()
        or (
          al.election_id is not null
          and exists (
            select 1 from public.elections ex
            where ex.id = al.election_id and ex.creator_id = auth.uid()
          )
        )
      )
  ) t;

  if v_row is null then
    return jsonb_build_object('success', false, 'message', 'Log not found.');
  end if;

  return jsonb_build_object('success', true, 'log', v_row);
end;
$$;

-- Vote cast audit (no candidate identity)
create or replace function public.cast_anonymous_vote(
  p_secret_id_text text,
  p_poll_id uuid,
  p_candidate_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_validation jsonb;
  v_row public.secret_ids%rowtype;
  v_election_id uuid;
  v_phase text;
  v_rows integer;
  v_locked boolean;
  v_result jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  v_validation := public.validate_secret_id_for_voting(p_secret_id_text, p_poll_id);

  if coalesce((v_validation->>'valid')::boolean, false) is not true then
    perform public.insert_audit_log(
      'Vote rejected',
      'Voting',
      coalesce(v_validation->>'message', 'Invalid Secret ID'),
      (v_validation->>'election_id')::uuid,
      p_poll_id,
      null,
      v_user_id
    );
    return jsonb_build_object(
      'success',
      false,
      'message',
      coalesce(v_validation->>'message', 'Invalid Secret ID')
    );
  end if;

  v_election_id := (v_validation->>'election_id')::uuid;

  select result_locked into v_locked from public.elections where id = v_election_id;

  if coalesce(v_locked, false) then
    perform public.insert_audit_log(
      'Vote rejected',
      'Voting',
      'Results Locked',
      v_election_id,
      p_poll_id,
      null,
      v_user_id
    );
    return jsonb_build_object('success', false, 'message', 'Results Locked');
  end if;

  select * into v_row
  from public.secret_ids s
  where s.id = (v_validation->>'secret_row_id')::uuid
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Invalid Secret ID');
  end if;

  v_phase := public.get_voting_phase(v_election_id);

  if v_phase <> 'open' then
    perform public.insert_audit_log(
      'Vote rejected',
      'Voting',
      case
        when v_phase = 'not_started' then 'Voting has not started yet'
        when v_phase = 'closed' then 'Election has ended'
        else 'Voting Closed'
      end,
      v_election_id,
      p_poll_id,
      null,
      v_user_id
    );
    return jsonb_build_object(
      'success',
      false,
      'message',
      case
        when v_phase = 'not_started' then 'Voting has not started yet'
        when v_phase = 'closed' then 'Election has ended'
        else 'Voting Closed'
      end
    );
  end if;

  if not exists (
    select 1
    from public.candidates c
    join public.polls p on p.election_id = c.election_id
    where c.id = p_candidate_id and p.id = p_poll_id
  ) then
    return jsonb_build_object('success', false, 'message', 'Invalid candidate for this poll.');
  end if;

  if exists (
    select 1 from public.voter_vote_status vvs
    where vvs.voter_id = v_user_id and vvs.poll_id = p_poll_id and vvs.has_voted = true
  ) then
    perform public.insert_audit_log(
      'Vote rejected',
      'Voting',
      'You have already voted',
      v_election_id,
      p_poll_id,
      null,
      v_user_id
    );
    return jsonb_build_object('success', false, 'message', 'You have already voted');
  end if;

  insert into public.voter_vote_status (voter_id, poll_id, has_voted, voted_at)
  values (v_user_id, p_poll_id, true, now())
  on conflict (voter_id, poll_id)
  do update set
    has_voted = true,
    voted_at = coalesce(public.voter_vote_status.voted_at, excluded.voted_at)
  where public.voter_vote_status.has_voted is not true;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return jsonb_build_object('success', false, 'message', 'You have already voted');
  end if;

  insert into public.votes (poll_id, candidate_id) values (p_poll_id, p_candidate_id);

  update public.secret_ids
  set used_at = now(), is_active = false
  where id = v_row.id and used_at is null;

  perform public.insert_audit_log(
    'Vote submitted',
    'Voting',
    'Anonymous ballot recorded for poll',
    v_election_id,
    p_poll_id,
    null,
    v_user_id
  );

  return jsonb_build_object(
    'success',
    true,
    'message',
    'Your vote has been submitted successfully.'
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'message', 'You have already voted');
end;
$$;

-- Secret ID validation audit
create or replace function public.validate_secret_id_for_voting(
  p_secret_id_text text,
  p_poll_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.secret_ids%rowtype;
  v_phase text;
  v_result jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('valid', false, 'message', 'Authentication required.');
  end if;

  if p_secret_id_text is null or trim(p_secret_id_text) = '' then
    v_result := jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
    perform public.insert_audit_log(
      'Secret ID validation failed',
      'Voting',
      'Empty secret ID',
      null,
      p_poll_id,
      null,
      v_user_id
    );
    return v_result;
  end if;

  select * into v_row
  from public.secret_ids s
  where upper(trim(s.secret_id)) = upper(trim(p_secret_id_text))
  limit 1;

  if not found then
    perform public.insert_audit_log(
      'Secret ID validation failed',
      'Voting',
      'Secret ID not found',
      null,
      p_poll_id,
      null,
      v_user_id
    );
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  if v_row.poll_id is distinct from p_poll_id
    or v_row.voter_id is distinct from v_user_id
    or v_row.is_active is not true
    or v_row.used_at is not null
  then
    perform public.insert_audit_log(
      'Secret ID validation failed',
      'Voting',
      'Secret ID invalid for voter or poll',
      v_row.election_id,
      p_poll_id,
      null,
      v_user_id
    );
    return jsonb_build_object('valid', false, 'message', 'Invalid Secret ID');
  end if;

  v_phase := public.get_voting_phase(v_row.election_id);

  if v_phase <> 'open' then
    perform public.insert_audit_log(
      'Secret ID validation failed',
      'Voting',
      'Voting not open',
      v_row.election_id,
      p_poll_id,
      null,
      v_user_id
    );
    return jsonb_build_object(
      'valid',
      false,
      'message',
      case
        when v_phase = 'not_started' then 'Voting has not started yet'
        when v_phase = 'closed' then 'Election has ended'
        else 'Voting Closed'
      end
    );
  end if;

  if exists (
    select 1 from public.voter_vote_status vvs
    where vvs.voter_id = v_user_id and vvs.poll_id = p_poll_id and vvs.has_voted = true
  ) then
    return jsonb_build_object('valid', false, 'message', 'You have already voted');
  end if;

  perform public.insert_audit_log(
    'Secret ID validated',
    'Voting',
    'Secret ID verified for voting session',
    v_row.election_id,
    p_poll_id,
    null,
    v_user_id
  );

  return jsonb_build_object(
    'valid',
    true,
    'secret_row_id',
    v_row.id,
    'election_id',
    v_row.election_id
  );
end;
$$;

-- Augment result lock/unlock with audit (preserve 014 logic)
create or replace function public.lock_election_results(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
begin
  select * into v_election from public.elections where id = p_election_id for update;
  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_election.result_locked then
    return jsonb_build_object('success', true, 'message', 'Results already locked.');
  end if;

  if v_election.result_status = 'Processing' then
    perform public.finalize_election_results(p_election_id);
    select * into v_election from public.elections where id = p_election_id;
  end if;

  update public.elections
  set result_status = 'Locked', result_locked = true
  where id = p_election_id;

  perform public.insert_result_log(p_election_id, 'Results locked');
  perform public.insert_audit_log(
    'Result locked',
    'Results',
    'Election results locked and frozen',
    p_election_id
  );

  return jsonb_build_object('success', true, 'message', 'Results locked.');
end;
$$;

create or replace function public.unlock_election_results(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin access required.');
  end if;

  update public.elections
  set result_locked = false, result_status = 'Completed'
  where id = p_election_id;

  perform public.insert_result_log(p_election_id, 'Results unlocked');
  perform public.insert_audit_log(
    'Result unlocked',
    'Results',
    'Election results unlocked by Super Admin',
    p_election_id
  );

  return jsonb_build_object('success', true, 'message', 'Results unlocked.');
end;
$$;

grant execute on function public.insert_audit_log(text, text, text, uuid, uuid, text, uuid) to authenticated;
grant execute on function public.insert_override_log(uuid, text, text, text, text, uuid) to authenticated;
grant execute on function public.get_audit_logs(text, text, text, text, timestamptz, timestamptz, integer, integer, uuid) to authenticated;
grant execute on function public.get_override_logs(uuid, integer, integer) to authenticated;
grant execute on function public.get_audit_dashboard_stats(integer) to authenticated;
grant execute on function public.get_audit_log_by_id(uuid) to authenticated;
grant execute on function public.can_export_audit_logs() to authenticated;

-- RLS
drop policy if exists "Scoped audit log read" on public.audit_logs;
create policy "Scoped audit log read"
  on public.audit_logs for select to authenticated
  using (
    public.is_super_admin()
    or user_id = auth.uid()
    or (
      election_id is not null
      and exists (
        select 1 from public.elections e
        where e.id = audit_logs.election_id and e.creator_id = auth.uid()
      )
    )
  );

drop policy if exists "Authenticated insert audit via RPC only" on public.audit_logs;
create policy "Authenticated insert audit via RPC only"
  on public.audit_logs for insert to authenticated
  with check (user_id = auth.uid() or public.is_super_admin());

drop policy if exists "Super Admin view override logs" on public.override_logs;
create policy "Super Admin view override logs"
  on public.override_logs for select to authenticated
  using (public.is_super_admin());

drop policy if exists "Super Admin insert override logs" on public.override_logs;
create policy "Super Admin insert override logs"
  on public.override_logs for insert to authenticated
  with check (public.is_super_admin());

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.audit_logs;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.override_logs;
exception
  when duplicate_object then null;
end $$;

-- Backfill legacy activity_logs into audit_logs (one-time)
insert into public.audit_logs (
  user_id,
  user_name,
  role,
  action_type,
  module_name,
  description,
  created_at
)
select
  al.user_id,
  coalesce(p.full_name, 'Unknown'),
  coalesce(p.role, 'User'),
  al.action,
  'Legacy',
  al.description,
  al.created_at
from public.activity_logs al
left join public.profiles p on p.id = al.user_id
where not exists (
  select 1 from public.audit_logs a
  where a.created_at = al.created_at
    and a.description = al.description
    and coalesce(a.user_id::text, '') = coalesce(al.user_id::text, '')
);
