-- =============================================================================
-- Public voting: registrations, candidates, votes + public read policies
-- =============================================================================

create table if not exists public.poll_candidates (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.election_registrations (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint election_registrations_unique unique (election_id, voter_id)
);

create table if not exists public.election_votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  candidate_id uuid not null references public.poll_candidates (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint election_votes_unique unique (poll_id, voter_id)
);

create index if not exists poll_candidates_poll_id_idx on public.poll_candidates (poll_id);
create index if not exists election_registrations_election_id_idx
  on public.election_registrations (election_id);
create index if not exists election_votes_election_id_idx on public.election_votes (election_id);
create index if not exists election_votes_poll_id_idx on public.election_votes (poll_id);

alter table public.poll_candidates enable row level security;
alter table public.election_registrations enable row level security;
alter table public.election_votes enable row level security;

-- Public read: non-draft elections
drop policy if exists "Public can view published elections" on public.elections;
create policy "Public can view published elections"
  on public.elections for select
  using (status <> 'Draft');

drop policy if exists "Public can view polls for published elections" on public.polls;
create policy "Public can view polls for published elections"
  on public.polls for select
  using (
    exists (
      select 1 from public.elections e
      where e.id = polls.election_id and e.status <> 'Draft'
    )
  );

drop policy if exists "Public can view poll candidates" on public.poll_candidates;
create policy "Public can view poll candidates"
  on public.poll_candidates for select
  using (
    exists (
      select 1 from public.polls p
      join public.elections e on e.id = p.election_id
      where p.id = poll_candidates.poll_id and e.status <> 'Draft'
    )
  );

drop policy if exists "Public can view vote counts" on public.election_votes;
create policy "Public can view vote counts"
  on public.election_votes for select
  using (true);

drop policy if exists "Public can view registration counts" on public.election_registrations;
create policy "Public can view registration counts"
  on public.election_registrations for select
  using (true);

-- Voters register for elections
drop policy if exists "Voters can register for elections" on public.election_registrations;
create policy "Voters can register for elections"
  on public.election_registrations for insert to authenticated
  with check (voter_id = auth.uid());

drop policy if exists "Voters can view own registrations" on public.election_registrations;
create policy "Voters can view own registrations"
  on public.election_registrations for select to authenticated
  using (voter_id = auth.uid());

-- Creators manage candidates for own elections
drop policy if exists "Creators manage candidates for own polls" on public.poll_candidates;
create policy "Creators manage candidates for own polls"
  on public.poll_candidates for all to authenticated
  using (
    exists (
      select 1 from public.polls p
      join public.elections e on e.id = p.election_id
      where p.id = poll_candidates.poll_id and e.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.polls p
      join public.elections e on e.id = p.election_id
      where p.id = poll_candidates.poll_id and e.creator_id = auth.uid()
    )
  );

-- Voters cast votes when registered
drop policy if exists "Voters can cast votes" on public.election_votes;
create policy "Voters can cast votes"
  on public.election_votes for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.election_registrations r
      where r.election_id = election_votes.election_id
        and r.voter_id = auth.uid()
    )
  );

-- Public read creator names on published elections
drop policy if exists "Public can view profiles of election creators" on public.profiles;
create policy "Public can view profiles of election creators"
  on public.profiles for select
  using (
    exists (
      select 1 from public.elections e
      where e.creator_id = profiles.id and e.status <> 'Draft'
    )
  );

-- Enable realtime for live vote counts (run once; ignore error if already added)
do $$
begin
  alter publication supabase_realtime add table public.election_votes;
exception
  when duplicate_object then null;
end $$;
