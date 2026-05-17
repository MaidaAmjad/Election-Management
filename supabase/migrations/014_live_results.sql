-- =============================================================================
-- Live election results, winner, turnout, locking
-- =============================================================================

alter table public.elections
  add column if not exists winner_id uuid references public.candidates (id) on delete set null,
  add column if not exists turnout_percentage numeric(6, 2),
  add column if not exists result_status text not null default 'Processing'
    constraint elections_result_status_check check (
      result_status in ('Processing', 'Completed', 'Locked')
    ),
  add column if not exists result_locked boolean not null default false;

create table if not exists public.result_logs (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists result_logs_election_id_idx on public.result_logs (election_id);
create index if not exists result_logs_created_at_idx on public.result_logs (created_at desc);

alter table public.result_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_view_election_results(p_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or public.is_election_creator(p_election_id)
    or (
      exists (
        select 1
        from public.elections e
        where e.id = p_election_id
          and (
            e.status = 'Completed'
            or e.result_status in ('Completed', 'Locked')
          )
          and exists (
            select 1
            from public.voter_registrations vr
            where vr.election_id = e.id
              and vr.voter_id = auth.uid()
              and vr.status in ('Registered', 'Approved')
          )
      )
    )
    );
$$;

create or replace function public.insert_result_log(
  p_election_id uuid,
  p_action text,
  p_user_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.result_logs (election_id, user_id, action)
  values (p_election_id, p_user_id, p_action);
end;
$$;

-- ---------------------------------------------------------------------------
-- Compute & persist results
-- ---------------------------------------------------------------------------

create or replace function public.compute_election_turnout(p_election_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_registered integer;
  v_ballots integer;
  v_unique_voters integer;
  v_pct numeric;
begin
  select count(*)::integer into v_registered
  from public.voter_registrations vr
  where vr.election_id = p_election_id
    and vr.status in ('Registered', 'Approved');

  select count(*)::integer into v_ballots
  from public.votes v
  join public.polls p on p.id = v.poll_id
  where p.election_id = p_election_id;

  select count(distinct vvs.voter_id)::integer into v_unique_voters
  from public.voter_vote_status vvs
  join public.polls p on p.id = vvs.poll_id
  where p.election_id = p_election_id
    and vvs.has_voted = true;

  if v_registered > 0 then
    v_pct := round((v_unique_voters::numeric / v_registered::numeric) * 100, 2);
  else
    v_pct := 0;
  end if;

  return jsonb_build_object(
    'registered_voters', v_registered,
    'total_votes_cast', v_ballots,
    'unique_voters_voted', v_unique_voters,
    'turnout_percentage', v_pct
  );
end;
$$;

create or replace function public.finalize_election_results(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_top_votes bigint := 0;
  v_winner_id uuid;
  v_tie boolean := false;
  v_turnout jsonb;
  v_pct numeric;
begin
  select * into v_election from public.elections where id = p_election_id for update;
  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_election.result_locked then
    return jsonb_build_object('success', false, 'message', 'Results are locked.');
  end if;

  if not (
    public.is_super_admin()
    or public.is_election_creator(p_election_id)
    or current_setting('request.jwt.claim.role', true) = 'service_role'
  ) then
    if v_election.status <> 'Completed' and now() <= v_election.end_datetime then
      return jsonb_build_object('success', false, 'message', 'Election is still active.');
    end if;
  end if;

  select coalesce(max(t.vote_count), 0) into v_top_votes
  from (
    select count(*)::bigint as vote_count
    from public.votes v
    join public.polls p on p.id = v.poll_id
    where p.election_id = p_election_id
    group by v.candidate_id
  ) t;

  if v_top_votes > 0 then
    select count(*) > 1 into v_tie
    from (
      select v.candidate_id, count(*)::bigint as vote_count
      from public.votes v
      join public.polls p on p.id = v.poll_id
      where p.election_id = p_election_id
      group by v.candidate_id
      having count(*) = v_top_votes
    ) tied;

    if not v_tie then
      select sub.candidate_id into v_winner_id
      from (
        select v.candidate_id, count(*)::bigint as vote_count
        from public.votes v
        join public.polls p on p.id = v.poll_id
        where p.election_id = p_election_id
        group by v.candidate_id
        order by count(*) desc
        limit 1
      ) sub;
    else
      v_winner_id := null;
    end if;
  else
    v_winner_id := null;
    v_tie := false;
  end if;

  v_turnout := public.compute_election_turnout(p_election_id);
  v_pct := (v_turnout->>'turnout_percentage')::numeric;

  update public.elections
  set
    winner_id = v_winner_id,
    turnout_percentage = v_pct,
    result_status = 'Completed'
  where id = p_election_id;

  perform public.insert_result_log(
    p_election_id,
    case when v_tie then 'Results finalized (tie detected)' else 'Results finalized' end
  );

  return jsonb_build_object(
    'success',
    true,
    'winner_id',
    v_winner_id,
    'is_tie',
    v_tie,
    'turnout',
    v_turnout
  );
end;
$$;

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
  set
    result_status = 'Locked',
    result_locked = true
  where id = p_election_id;

  perform public.insert_result_log(p_election_id, 'Results locked');

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
  set
    result_locked = false,
    result_status = 'Completed'
  where id = p_election_id;

  perform public.insert_result_log(p_election_id, 'Results unlocked');

  return jsonb_build_object('success', true, 'message', 'Results unlocked.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Live results payload
-- ---------------------------------------------------------------------------

create or replace function public.get_ranked_candidates_for_election(
  p_election_id uuid,
  p_poll_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  select coalesce(sum(cnt), 0) into v_total
  from (
    select count(*)::bigint as cnt
    from public.votes v
    join public.polls p on p.id = v.poll_id
    where p.election_id = p_election_id
      and (p_poll_id is null or v.poll_id = p_poll_id)
    group by v.candidate_id
  ) sub;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',
          r.id,
          'name',
          r.name,
          'designation',
          r.designation,
          'photo_url',
          r.photo_url,
          'manifesto',
          r.manifesto,
          'vote_count',
          r.vote_count,
          'vote_percentage',
          r.vote_percentage,
          'rank',
          r.rank
        )
        order by r.rank asc
      )
      from (
        select
          c.id,
          c.name,
          c.designation,
          c.photo_url,
          left(c.manifesto, 200) as manifesto,
          coalesce(vc.cnt, 0)::bigint as vote_count,
          case
            when v_total > 0 then round((coalesce(vc.cnt, 0)::numeric / v_total::numeric) * 100, 2)
            else 0
          end as vote_percentage,
          row_number() over (
            order by coalesce(vc.cnt, 0) desc, c.name asc
          )::integer as rank
        from public.candidates c
        left join (
          select v.candidate_id, count(*)::bigint as cnt
          from public.votes v
          join public.polls p on p.id = v.poll_id
          where p.election_id = p_election_id
            and (p_poll_id is null or v.poll_id = p_poll_id)
          group by v.candidate_id
        ) vc on vc.candidate_id = c.id
        where c.election_id = p_election_id
      ) r
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_vote_trend_for_election(
  p_election_id uuid,
  p_poll_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'bucket',
          b.bucket,
          'vote_count',
          b.vote_count,
          'cumulative',
          sum(b.vote_count) over (order by b.bucket)
        )
        order by b.bucket
      )
      from (
        select
          date_trunc('hour', v.created_at) as bucket,
          count(*)::integer as vote_count
        from public.votes v
        join public.polls p on p.id = v.poll_id
        where p.election_id = p_election_id
          and (p_poll_id is null or v.poll_id = p_poll_id)
        group by date_trunc('hour', v.created_at)
      ) b
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.get_live_election_results(
  p_election_id uuid,
  p_poll_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_candidates jsonb;
  v_turnout jsonb;
  v_trend jsonb;
  v_top_votes bigint;
  v_tie boolean := false;
  v_winner jsonb;
  v_total_votes bigint;
  v_polls jsonb;
begin
  if not public.can_view_election_results(p_election_id) then
    return jsonb_build_object('success', false, 'message', 'Access denied.');
  end if;

  perform public.sync_election_status(p_election_id);

  select * into v_election from public.elections where id = p_election_id;
  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_election.status = 'Completed'
    and v_election.result_status = 'Processing'
    and not v_election.result_locked
  then
    perform public.finalize_election_results(p_election_id);
    perform public.lock_election_results(p_election_id);
    select * into v_election from public.elections where id = p_election_id;
  end if;

  v_candidates := public.get_ranked_candidates_for_election(p_election_id, p_poll_id);
  v_turnout := public.compute_election_turnout(p_election_id);
  v_trend := public.get_vote_trend_for_election(p_election_id, p_poll_id);

  select coalesce(sum((c->>'vote_count')::bigint), 0) into v_total_votes
  from jsonb_array_elements(v_candidates) c;

  select coalesce(max((c->>'vote_count')::bigint), 0) into v_top_votes
  from jsonb_array_elements(v_candidates) c;

  if v_top_votes > 0 then
    select count(*) > 1 into v_tie
    from jsonb_array_elements(v_candidates) c
    where (c->>'vote_count')::bigint = v_top_votes;
  end if;

  if v_election.winner_id is not null and not v_tie then
    select jsonb_build_object(
      'id',
      c.id,
      'name',
      c.name,
      'designation',
      c.designation,
      'photo_url',
      c.photo_url,
      'vote_count',
      (elem->>'vote_count')::bigint,
      'vote_percentage',
      (elem->>'vote_percentage')::numeric
    )
    into v_winner
    from public.candidates c
    join jsonb_array_elements(v_candidates) elem on (elem->>'id')::uuid = c.id
    where c.id = v_election.winner_id
    limit 1;
  elsif v_tie and v_election.status = 'Completed' then
    v_winner := null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', p.id, 'title', p.title)
      order by p.created_at asc
    ),
    '[]'::jsonb
  )
  into v_polls
  from public.polls p
  where p.election_id = p_election_id;

  return jsonb_build_object(
    'success',
    true,
    'election',
    jsonb_build_object(
      'id',
      v_election.id,
      'title',
      v_election.title,
      'category',
      v_election.category,
      'status',
      v_election.status,
      'start_datetime',
      v_election.start_datetime,
      'end_datetime',
      v_election.end_datetime,
      'result_status',
      v_election.result_status,
      'result_locked',
      v_election.result_locked,
      'turnout_percentage',
      v_election.turnout_percentage,
      'winner_id',
      v_election.winner_id
    ),
    'polls',
    v_polls,
    'selected_poll_id',
    p_poll_id,
    'candidates',
    v_candidates,
    'total_votes',
    v_total_votes,
    'turnout',
    v_turnout,
    'vote_trend',
    v_trend,
    'is_tie',
    v_tie,
    'winner',
    v_winner,
    'tied_candidates',
    case
      when v_tie then (
        select coalesce(jsonb_agg(c), '[]'::jsonb)
        from jsonb_array_elements(v_candidates) c
        where (c->>'vote_count')::bigint = v_top_votes
      )
      else '[]'::jsonb
    end,
    'is_live',
    v_election.status in ('Published', 'Active')
      and not v_election.result_locked
      and now() <= v_election.end_datetime
  );
end;
$$;

create or replace function public.get_election_results_history()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(row_data order by (row_data->>'end_datetime') desc)
      from (
        select jsonb_build_object(
          'id',
          e.id,
          'title',
          e.title,
          'category',
          e.category,
          'status',
          e.status,
          'end_datetime',
          e.end_datetime,
          'result_status',
          e.result_status,
          'result_locked',
          e.result_locked,
          'turnout_percentage',
          e.turnout_percentage,
          'total_votes',
          (
            select count(*)::integer
            from public.votes v
            join public.polls p on p.id = v.poll_id
            where p.election_id = e.id
          ),
          'winner',
          case
            when w.id is not null then jsonb_build_object(
              'id',
              w.id,
              'name',
              w.name,
              'photo_url',
              w.photo_url
            )
            else null
          end,
          'result_date',
          e.end_datetime
        ) as row_data
        from public.elections e
        left join public.candidates w on w.id = e.winner_id
        where e.status <> 'Draft'
          and (
            public.is_super_admin()
            or (public.is_election_creator(e.id))
            or (
              e.result_status in ('Completed', 'Locked')
              and exists (
                select 1
                from public.voter_registrations vr
                where vr.election_id = e.id
                  and vr.voter_id = v_user_id
                  and vr.status in ('Registered', 'Approved')
              )
            )
          )
      ) sub
    ),
    '[]'::jsonb
  );
end;
$$;

-- Block voting when results locked
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
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  v_validation := public.validate_secret_id_for_voting(p_secret_id_text, p_poll_id);

  if coalesce((v_validation->>'valid')::boolean, false) is not true then
    return jsonb_build_object(
      'success',
      false,
      'message',
      coalesce(v_validation->>'message', 'Invalid Secret ID')
    );
  end if;

  v_election_id := (v_validation->>'election_id')::uuid;

  select result_locked into v_locked
  from public.elections
  where id = v_election_id;

  if coalesce(v_locked, false) then
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
    where c.id = p_candidate_id
      and p.id = p_poll_id
  ) then
    return jsonb_build_object('success', false, 'message', 'Invalid candidate for this poll.');
  end if;

  if exists (
    select 1
    from public.voter_vote_status vvs
    where vvs.voter_id = v_user_id
      and vvs.poll_id = p_poll_id
      and vvs.has_voted = true
  ) then
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

  insert into public.votes (poll_id, candidate_id)
  values (p_poll_id, p_candidate_id);

  update public.secret_ids
  set
    used_at = now(),
    is_active = false
  where id = v_row.id
    and used_at is null;

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

grant execute on function public.can_view_election_results(uuid) to authenticated;
grant execute on function public.compute_election_turnout(uuid) to authenticated;
grant execute on function public.finalize_election_results(uuid) to authenticated;
grant execute on function public.lock_election_results(uuid) to authenticated;
grant execute on function public.unlock_election_results(uuid) to authenticated;
grant execute on function public.get_ranked_candidates_for_election(uuid, uuid) to authenticated;
grant execute on function public.get_vote_trend_for_election(uuid, uuid) to authenticated;
grant execute on function public.get_live_election_results(uuid, uuid) to authenticated;
grant execute on function public.get_election_results_history() to authenticated;

-- RLS result_logs
drop policy if exists "Managers view result logs" on public.result_logs;
create policy "Managers view result logs"
  on public.result_logs for select to authenticated
  using (
    public.is_super_admin()
    or public.is_election_creator(election_id)
  );

drop policy if exists "Managers insert result logs" on public.result_logs;
create policy "Managers insert result logs"
  on public.result_logs for insert to authenticated
  with check (
    public.is_super_admin()
    or public.is_election_creator(election_id)
  );

-- Realtime on elections for result status
do $$
begin
  alter publication supabase_realtime add table public.elections;
exception
  when duplicate_object then null;
end $$;
