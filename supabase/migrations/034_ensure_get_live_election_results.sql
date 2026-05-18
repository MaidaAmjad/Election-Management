-- =============================================================================
-- Ensure get_live_election_results exists (run if 014 was skipped).
-- Reload API schema in Supabase Dashboard after applying.
-- =============================================================================

alter table public.elections
  add column if not exists winner_id uuid references public.candidates (id) on delete set null;

alter table public.elections
  add column if not exists turnout_percentage numeric(6, 2);

alter table public.elections
  add column if not exists result_locked boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'elections'
      and column_name = 'result_status'
  ) then
    alter table public.elections
      add column result_status text not null default 'Processing';
  end if;
end;
$$;

create table if not exists public.result_logs (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists result_logs_election_id_idx on public.result_logs (election_id);

alter table public.result_logs enable row level security;

drop policy if exists "Managers view result logs" on public.result_logs;
create policy "Managers view result logs"
  on public.result_logs for select to authenticated
  using (
    public.is_super_admin()
    or public.is_election_creator(election_id)
  );

create or replace function public.sync_election_status(p_election_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_new_status text;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found then
    return null;
  end if;

  if v_election.status = 'Draft' then
    return v_election.status;
  end if;

  if now() > v_election.end_datetime then
    v_new_status := 'Completed';
  elsif now() >= v_election.start_datetime and now() <= v_election.end_datetime then
    v_new_status := 'Active';
  else
    v_new_status := v_election.status;
    if v_election.status = 'Completed' then
      return 'Completed';
    end if;
    return coalesce(v_election.status, 'Published');
  end if;

  if v_election.status is distinct from v_new_status then
    update public.elections
    set status = v_new_status
    where id = p_election_id;
  end if;

  return v_new_status;
end;
$$;

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
    );
$$;

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
  if p_poll_id is not null then
    select coalesce(sum(cnt), 0) into v_total
    from (
      select count(*)::bigint as cnt
      from public.votes v
      where v.poll_id = p_poll_id
      group by v.candidate_id
    ) sub;

    return coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'designation', r.designation,
            'photo_url', r.photo_url,
            'manifesto', left(r.manifesto, 200),
            'vote_count', r.vote_count,
            'vote_percentage', r.vote_percentage,
            'rank', r.rank
          )
          order by r.rank asc
        )
        from (
          select
            c.id,
            c.name,
            c.designation,
            c.photo_url,
            c.manifesto,
            coalesce(vc.cnt, 0)::bigint as vote_count,
            case
              when v_total > 0 then
                round((coalesce(vc.cnt, 0)::numeric / v_total::numeric) * 100, 2)
              else 0
            end as vote_percentage,
            row_number() over (
              order by coalesce(vc.cnt, 0) desc, c.name asc
            )::integer as rank
          from public.candidates c
          inner join (
            select po.candidate_id
            from public.poll_options po
            where po.poll_id = p_poll_id
            union
            select c2.id
            from public.candidates c2
            where c2.poll_id = p_poll_id
          ) poll_cands on poll_cands.candidate_id = c.id
          left join (
            select v.candidate_id, count(*)::bigint as cnt
            from public.votes v
            where v.poll_id = p_poll_id
            group by v.candidate_id
          ) vc on vc.candidate_id = c.id
          where c.election_id = p_election_id
        ) r
      ),
      '[]'::jsonb
    );
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'designation', r.designation,
          'photo_url', r.photo_url,
          'manifesto', r.manifesto,
          'vote_count', r.vote_count,
          'vote_percentage', r.vote_percentage,
          'rank', r.rank
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
            when tot.total > 0 then
              round((coalesce(vc.cnt, 0)::numeric / tot.total::numeric) * 100, 2)
            else 0
          end as vote_percentage,
          row_number() over (
            order by coalesce(vc.cnt, 0) desc, c.name asc
          )::integer as rank
        from public.candidates c
        cross join (
          select coalesce(sum(sub.cnt), 0)::bigint as total
          from (
            select count(*)::bigint as cnt
            from public.votes v
            join public.polls p on p.id = v.poll_id
            where p.election_id = p_election_id
              and coalesce(p.is_staging, false) = false
            group by v.candidate_id
          ) sub
        ) tot
        left join (
          select v.candidate_id, count(*)::bigint as cnt
          from public.votes v
          join public.polls p on p.id = v.poll_id
          where p.election_id = p_election_id
            and coalesce(p.is_staging, false) = false
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
          'bucket', b.bucket,
          'vote_count', b.vote_count,
          'cumulative', sum(b.vote_count) over (order by b.bucket)
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
          and coalesce(p.is_staging, false) = false
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
      'id', c.id,
      'name', c.name,
      'designation', c.designation,
      'photo_url', c.photo_url,
      'vote_count', (elem->>'vote_count')::bigint,
      'vote_percentage', (elem->>'vote_percentage')::numeric
    )
    into v_winner
    from public.candidates c
    join jsonb_array_elements(v_candidates) elem on (elem->>'id')::uuid = c.id
    where c.id = v_election.winner_id
    limit 1;
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title) order by p.created_at asc),
    '[]'::jsonb
  )
  into v_polls
  from public.polls p
  where p.election_id = p_election_id
    and coalesce(p.is_staging, false) = false;

  return jsonb_build_object(
    'success', true,
    'election', jsonb_build_object(
      'id', v_election.id,
      'title', v_election.title,
      'category', v_election.category,
      'status', v_election.status,
      'start_datetime', v_election.start_datetime,
      'end_datetime', v_election.end_datetime,
      'result_status', v_election.result_status,
      'result_locked', v_election.result_locked,
      'turnout_percentage', v_election.turnout_percentage,
      'winner_id', v_election.winner_id
    ),
    'polls', v_polls,
    'selected_poll_id', p_poll_id,
    'candidates', v_candidates,
    'total_votes', v_total_votes,
    'turnout', v_turnout,
    'vote_trend', v_trend,
    'is_tie', v_tie,
    'winner', v_winner,
    'tied_candidates', case
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

grant execute on function public.sync_election_status(uuid) to authenticated;
grant execute on function public.can_view_election_results(uuid) to authenticated;
grant execute on function public.compute_election_turnout(uuid) to authenticated;
grant execute on function public.get_ranked_candidates_for_election(uuid, uuid) to authenticated;
grant execute on function public.get_vote_trend_for_election(uuid, uuid) to authenticated;
grant execute on function public.get_live_election_results(uuid, uuid) to authenticated;
