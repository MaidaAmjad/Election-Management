-- =============================================================================
-- Dashboard analytics RPCs (Super Admin, Creator, Voter)
-- =============================================================================

create or replace function public.election_effective_phase(e public.elections)
returns text
language sql
immutable
as $$
  select case
    when e.status = 'Draft' then 'Draft'
    when e.status = 'Draft' is false and now() < e.start_datetime then 'Upcoming'
    when now() >= e.start_datetime and now() <= e.end_datetime then 'Active'
    when now() > e.end_datetime then 'Completed'
    else coalesce(e.status, 'Published')
  end;
$$;

-- ---------------------------------------------------------------------------
-- Super Admin dashboard
-- ---------------------------------------------------------------------------

create or replace function public.get_admin_dashboard_stats(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin only.');
  end if;

  return jsonb_build_object(
    'success',
    true,
    'cards',
    jsonb_build_object(
      'total_elections',
      (select count(*)::integer from public.elections),
      'active_elections',
      (
        select count(*)::integer
        from public.elections e
        where e.status <> 'Draft'
          and now() >= e.start_datetime
          and now() <= e.end_datetime
      ),
      'upcoming_elections',
      (
        select count(*)::integer
        from public.elections e
        where e.status <> 'Draft' and now() < e.start_datetime
      ),
      'completed_elections',
      (
        select count(*)::integer
        from public.elections e
        where e.status <> 'Draft' and now() > e.end_datetime
      ),
      'total_users',
      (select count(*)::integer from public.profiles),
      'total_creators',
      (
        select count(*)::integer
        from public.profiles p
        where p.role = 'Election Creator'
      ),
      'total_voters',
      (
        select count(*)::integer from public.profiles p where p.role = 'Voter'
      ),
      'total_votes_cast',
      (select count(*)::integer from public.votes)
    ),
    'charts',
    jsonb_build_object(
      'elections_over_time',
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('date', d.day, 'count', d.cnt) order by d.day)
          from (
            select date_trunc('day', e.created_at)::date as day, count(*)::integer as cnt
            from public.elections e
            where e.created_at >= v_since
            group by 1
          ) d
        ),
        '[]'::jsonb
      ),
      'user_distribution',
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('role', p.role, 'count', p.cnt))
          from (
            select role, count(*)::integer as cnt
            from public.profiles
            group by role
          ) p
        ),
        '[]'::jsonb
      ),
      'voting_participation',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'election_id',
              sub.id,
              'title',
              sub.title,
              'votes',
              sub.votes,
              'registered',
              sub.registered
            )
            order by sub.votes desc
          )
          from (
            select
              e.id,
              e.title,
              (
                select count(*)::integer
                from public.votes v
                join public.polls p on p.id = v.poll_id
                where p.election_id = e.id
              ) as votes,
              (
                select count(*)::integer
                from public.voter_registrations vr
                where vr.election_id = e.id
                  and vr.status in ('Registered', 'Approved')
              ) as registered
            from public.elections e
            where e.status <> 'Draft'
            order by votes desc
            limit 8
          ) sub
        ),
        '[]'::jsonb
      ),
      'election_status_split',
      jsonb_build_array(
        jsonb_build_object(
          'name',
          'Active',
          'value',
          (
            select count(*)::integer
            from public.elections e
            where e.status <> 'Draft'
              and now() >= e.start_datetime
              and now() <= e.end_datetime
          )
        ),
        jsonb_build_object(
          'name',
          'Upcoming',
          'value',
          (
            select count(*)::integer
            from public.elections e
            where e.status <> 'Draft' and now() < e.start_datetime
          )
        ),
        jsonb_build_object(
          'name',
          'Completed',
          'value',
          (
            select count(*)::integer
            from public.elections e
            where e.status <> 'Draft' and now() > e.end_datetime
          )
        ),
        jsonb_build_object(
          'name',
          'Draft',
          'value',
          (select count(*)::integer from public.elections e where e.status = 'Draft')
        )
      ),
      'daily_activity',
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('date', d.day, 'count', d.cnt) order by d.day)
          from (
            select date_trunc('day', al.created_at)::date as day, count(*)::integer as cnt
            from public.audit_logs al
            where al.created_at >= v_since
            group by 1
          ) d
        ),
        '[]'::jsonb
      )
    )
  );
end;
$$;

create or replace function public.get_admin_recent_activity(p_limit integer default 15)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t) order by t.created_at desc)
      from (
        select
          al.id,
          al.action_type,
          al.module_name,
          al.description,
          al.created_at,
          p.full_name as user_name,
          e.title as election_title
        from public.audit_logs al
        left join public.profiles p on p.id = al.user_id
        left join public.elections e on e.id = al.election_id
        where al.action_type ilike '%login%'
          or al.action_type ilike '%approved%'
          or al.action_type ilike '%signup%'
          or al.action_type ilike '%published%'
          or al.action_type ilike '%registration%'
          or al.module_name in ('Approval', 'Election', 'Authentication')
        order by al.created_at desc
        limit greatest(p_limit, 1)
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Election Creator dashboard
-- ---------------------------------------------------------------------------

create or replace function public.get_creator_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_creator uuid := auth.uid();
begin
  if v_creator is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  return jsonb_build_object(
    'success',
    true,
    'cards',
    jsonb_build_object(
      'my_elections',
      (select count(*)::integer from public.elections e where e.creator_id = v_creator),
      'active_elections',
      (
        select count(*)::integer
        from public.elections e
        where e.creator_id = v_creator
          and e.status <> 'Draft'
          and now() >= e.start_datetime
          and now() <= e.end_datetime
      ),
      'draft_elections',
      (
        select count(*)::integer
        from public.elections e
        where e.creator_id = v_creator and e.status = 'Draft'
      ),
      'completed_elections',
      (
        select count(*)::integer
        from public.elections e
        where e.creator_id = v_creator
          and e.status <> 'Draft'
          and now() > e.end_datetime
      ),
      'total_candidates',
      (
        select count(*)::integer
        from public.candidates c
        join public.elections e on e.id = c.election_id
        where e.creator_id = v_creator
      ),
      'total_registered_voters',
      (
        select count(*)::integer
        from public.voter_registrations vr
        join public.elections e on e.id = vr.election_id
        where e.creator_id = v_creator
          and vr.status in ('Registered', 'Approved')
      )
    )
  );
end;
$$;

create or replace function public.get_creator_dashboard_elections(
  p_search text default null,
  p_status text default 'all',
  p_page integer default 1,
  p_page_size integer default 6
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_creator uuid := auth.uid();
  v_total bigint;
  v_rows jsonb;
  v_offset integer;
begin
  if v_creator is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  v_offset := greatest(0, (greatest(p_page, 1) - 1) * greatest(p_page_size, 1));

  select count(*) into v_total
  from public.elections e
  where e.creator_id = v_creator
    and (
      p_search is null
      or trim(p_search) = ''
      or e.title ilike '%' || trim(p_search) || '%'
      or e.category ilike '%' || trim(p_search) || '%'
    )
    and (
      p_status is null
      or p_status = ''
      or p_status = 'all'
      or (p_status = 'Draft' and e.status = 'Draft')
      or (
        p_status = 'Active'
        and e.status <> 'Draft'
        and now() >= e.start_datetime
        and now() <= e.end_datetime
      )
      or (p_status = 'Upcoming' and e.status <> 'Draft' and now() < e.start_datetime)
      or (p_status = 'Completed' and e.status <> 'Draft' and now() > e.end_datetime)
      or (p_status = 'Published' and e.status <> 'Draft' and now() < e.start_datetime)
    );

  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) into v_rows
  from (
    select
      e.id,
      e.title,
      e.category,
      e.status,
      e.start_datetime,
      e.end_datetime,
      e.result_status,
      e.turnout_percentage,
      (
        select count(*)::integer
        from public.voter_registrations vr
        where vr.election_id = e.id
          and vr.status in ('Registered', 'Approved')
      ) as registered_voters,
      (
        select count(*)::integer
        from public.votes v
        join public.polls p on p.id = v.poll_id
        where p.election_id = e.id
      ) as vote_count,
      case
        when e.status = 'Draft' then 'Draft'
        when now() < e.start_datetime then 'Published'
        when now() >= e.start_datetime and now() <= e.end_datetime then 'Active'
        else 'Completed'
      end as effective_status
    from public.elections e
    where e.creator_id = v_creator
      and (
        p_search is null
        or trim(p_search) = ''
        or e.title ilike '%' || trim(p_search) || '%'
        or e.category ilike '%' || trim(p_search) || '%'
      )
      and (
        p_status is null
        or p_status = ''
        or p_status = 'all'
        or (p_status = 'Draft' and e.status = 'Draft')
        or (
          p_status = 'Active'
          and e.status <> 'Draft'
          and now() >= e.start_datetime
          and now() <= e.end_datetime
        )
        or (p_status = 'Upcoming' and e.status <> 'Draft' and now() < e.start_datetime)
        or (p_status = 'Completed' and e.status <> 'Draft' and now() > e.end_datetime)
      )
    order by e.created_at desc
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

create or replace function public.get_creator_results_summary(p_limit integer default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_creator uuid := auth.uid();
begin
  if v_creator is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t) order by t.end_datetime desc)
      from (
        select
          e.id,
          e.title,
          e.turnout_percentage,
          e.result_status,
          e.end_datetime,
          c.name as winner_name,
          (
            select count(*)::integer
            from public.votes v
            join public.polls p on p.id = v.poll_id
            where p.election_id = e.id
          ) as total_votes
        from public.elections e
        left join public.candidates c on c.id = e.winner_id
        where e.creator_id = v_creator
          and e.status <> 'Draft'
          and now() > e.end_datetime
        order by e.end_datetime desc
        limit greatest(p_limit, 1)
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Voter dashboard
-- ---------------------------------------------------------------------------

create or replace function public.get_voter_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_voter uuid := auth.uid();
begin
  if v_voter is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  return jsonb_build_object(
    'success',
    true,
    'cards',
    jsonb_build_object(
      'joined_polls',
      (
        select count(*)::integer
        from public.voter_registrations vr
        where vr.voter_id = v_voter
          and vr.status in ('Registered', 'Approved', 'Waitlisted')
      ),
      'active_polls',
      (
        select count(distinct p.id)::integer
        from public.voter_registrations vr
        join public.elections e on e.id = vr.election_id
        join public.polls p on p.election_id = e.id
        where vr.voter_id = v_voter
          and vr.status in ('Registered', 'Approved')
          and e.status <> 'Draft'
          and now() >= e.start_datetime
          and now() <= e.end_datetime
      ),
      'completed_polls',
      (
        select count(distinct p.id)::integer
        from public.voter_registrations vr
        join public.elections e on e.id = vr.election_id
        join public.polls p on p.election_id = e.id
        where vr.voter_id = v_voter
          and vr.status in ('Registered', 'Approved')
          and now() > e.end_datetime
      ),
      'pending_polls',
      (
        select count(distinct p.id)::integer
        from public.voter_registrations vr
        join public.elections e on e.id = vr.election_id
        join public.polls p on p.election_id = e.id
        where vr.voter_id = v_voter
          and vr.status in ('Registered', 'Approved', 'Waitlisted')
          and e.status <> 'Draft'
          and now() < e.start_datetime
      )
    )
  );
end;
$$;

create or replace function public.get_voter_dashboard_polls(
  p_search text default null,
  p_status text default 'all',
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_voter uuid := auth.uid();
begin
  if v_voter is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t) order by t.start_datetime desc)
      from (
        select
          p.id as poll_id,
          p.title as poll_title,
          e.id as election_id,
          e.title as election_title,
          e.start_datetime,
          e.end_datetime,
          vr.status as registration_status,
          case
            when e.status = 'Draft' or now() < e.start_datetime then 'Not Started'
            when now() > e.end_datetime then 'Completed'
            when exists (
              select 1
              from public.voter_vote_status vvs
              where vvs.voter_id = v_voter
                and vvs.poll_id = p.id
                and vvs.has_voted = true
            ) then 'Voted'
            when now() >= e.start_datetime and now() <= e.end_datetime then 'Active'
            else 'Not Started'
          end as voting_status,
          c.name as winner_name,
          e.result_status,
          e.turnout_percentage
        from public.voter_registrations vr
        join public.elections e on e.id = vr.election_id
        join public.polls p on p.election_id = e.id
        left join public.candidates c on c.id = e.winner_id
        where vr.voter_id = v_voter
          and vr.status in ('Registered', 'Approved', 'Waitlisted')
          and (
            p_search is null
            or trim(p_search) = ''
            or p.title ilike '%' || trim(p_search) || '%'
            or e.title ilike '%' || trim(p_search) || '%'
          )
          and (
            p_status is null
            or p_status = ''
            or p_status = 'all'
            or (
              p_status = 'Not Started'
              and (e.status = 'Draft' or now() < e.start_datetime)
            )
            or (
              p_status = 'Active'
              and now() >= e.start_datetime
              and now() <= e.end_datetime
              and not exists (
                select 1
                from public.voter_vote_status vvs
                where vvs.voter_id = v_voter
                  and vvs.poll_id = p.id
                  and vvs.has_voted = true
              )
            )
            or (
              p_status = 'Voted'
              and exists (
                select 1
                from public.voter_vote_status vvs
                where vvs.voter_id = v_voter
                  and vvs.poll_id = p.id
                  and vvs.has_voted = true
              )
            )
            or (p_status = 'Completed' and now() > e.end_datetime)
          )
        order by e.start_datetime desc
        limit greatest(p_limit, 1)
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_voter_results_summary(p_limit integer default 5)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_voter uuid := auth.uid();
begin
  if v_voter is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_to_json(t) order by t.end_datetime desc)
      from (
        select distinct on (e.id)
          e.id,
          e.title,
          e.turnout_percentage,
          e.result_status,
          e.end_datetime,
          c.name as winner_name,
          exists (
            select 1
            from public.voter_vote_status vvs
            join public.polls p on p.id = vvs.poll_id
            where vvs.voter_id = v_voter
              and p.election_id = e.id
              and vvs.has_voted = true
          ) as participated
        from public.voter_registrations vr
        join public.elections e on e.id = vr.election_id
        left join public.candidates c on c.id = e.winner_id
        where vr.voter_id = v_voter
          and vr.status in ('Registered', 'Approved')
          and now() > e.end_datetime
        order by e.id, e.end_datetime desc
        limit greatest(p_limit, 1)
      ) t
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_admin_dashboard_stats(integer) to authenticated;
grant execute on function public.get_admin_recent_activity(integer) to authenticated;
grant execute on function public.get_creator_dashboard_stats() to authenticated;
grant execute on function public.get_creator_dashboard_elections(text, text, integer, integer) to authenticated;
grant execute on function public.get_creator_results_summary(integer) to authenticated;
grant execute on function public.get_voter_dashboard_stats() to authenticated;
grant execute on function public.get_voter_dashboard_polls(text, text, integer) to authenticated;
grant execute on function public.get_voter_results_summary(integer) to authenticated;
