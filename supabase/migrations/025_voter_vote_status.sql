-- =============================================================================
-- Ensures voting tables exist (required by voter dashboard RPCs in 017).
-- Safe to run if 013_voting_module.sql was skipped or partially applied.
-- =============================================================================

alter table public.polls
  add column if not exists is_staging boolean not null default false;

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists votes_poll_id_idx on public.votes (poll_id);
create index if not exists votes_candidate_id_idx on public.votes (candidate_id);
create index if not exists votes_created_at_idx on public.votes (created_at desc);

create table if not exists public.voter_vote_status (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references auth.users (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  has_voted boolean not null default false,
  voted_at timestamptz,
  constraint voter_vote_status_unique unique (voter_id, poll_id)
);

create index if not exists voter_vote_status_voter_id_idx
  on public.voter_vote_status (voter_id);
create index if not exists voter_vote_status_poll_id_idx
  on public.voter_vote_status (poll_id);

alter table public.votes enable row level security;
alter table public.voter_vote_status enable row level security;

drop view if exists public.poll_vote_counts;
create view public.poll_vote_counts
as
select
  v.poll_id,
  v.candidate_id,
  count(*)::bigint as vote_count
from public.votes v
group by v.poll_id, v.candidate_id;

grant select on public.poll_vote_counts to authenticated, anon;

drop policy if exists "No direct vote reads" on public.votes;
create policy "No direct vote reads"
  on public.votes for select to authenticated
  using (false);

drop policy if exists "No direct vote inserts" on public.votes;
create policy "No direct vote inserts"
  on public.votes for insert to authenticated
  with check (false);

drop policy if exists "Voters view own vote status" on public.voter_vote_status;
create policy "Voters view own vote status"
  on public.voter_vote_status for select to authenticated
  using (voter_id = auth.uid());

drop policy if exists "No direct vote status writes" on public.voter_vote_status;
create policy "No direct vote status writes"
  on public.voter_vote_status for insert to authenticated
  with check (false);

drop policy if exists "Managers view vote status counts" on public.voter_vote_status;
create policy "Managers view vote status counts"
  on public.voter_vote_status for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1
      from public.polls p
      where p.id = voter_vote_status.poll_id
        and public.is_election_creator(p.election_id)
    )
  );

-- Exclude staging (candidate-pool) polls from voter dashboard when column exists
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
          and coalesce(p.is_staging, false) = false
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
          and coalesce(p.is_staging, false) = false
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
          and coalesce(p.is_staging, false) = false
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
          and coalesce(p.is_staging, false) = false
          and now() < e.start_datetime
      )
    )
  );
end;
$$;

grant execute on function public.get_voter_dashboard_stats() to authenticated;
grant execute on function public.get_voter_dashboard_polls(text, text, integer) to authenticated;
