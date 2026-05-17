-- =============================================================================
-- Ensure poll_vote_counts view exists (required by public elections + results)
-- Run if migration 013 was skipped or the view was not exposed to the API.
-- =============================================================================

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Owner privileges so aggregated counts are visible to anon/authenticated via the view
create or replace view public.poll_vote_counts
as
select
  v.poll_id,
  v.candidate_id,
  count(*)::bigint as vote_count
from public.votes v
group by v.poll_id, v.candidate_id;

grant select on public.poll_vote_counts to authenticated, anon;

-- RPC for public elections page (works even when direct view access is restricted)
create or replace function public.get_public_election_vote_totals(p_election_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_object_agg(election_id::text, total)
      from (
        select p.election_id, count(v.id)::bigint as total
        from public.votes v
        inner join public.polls p on p.id = v.poll_id
        where p.election_id = any(coalesce(p_election_ids, array[]::uuid[]))
        group by p.election_id
      ) t
    ),
    '{}'::jsonb
  );
$$;

grant execute on function public.get_public_election_vote_totals(uuid[]) to authenticated, anon;
