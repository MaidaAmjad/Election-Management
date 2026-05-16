-- =============================================================================
-- Election Management — elections & polls tables
-- =============================================================================

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null,
  category text not null
    constraint elections_category_check check (
      category in (
        'Student Election',
        'Organization Election',
        'Club Election',
        'Committee Election',
        'General Voting',
        'Other'
      )
    ),
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  registration_deadline timestamptz not null,
  max_voters integer not null
    constraint elections_max_voters_check check (max_voters >= 1),
  status text not null default 'Draft'
    constraint elections_status_check check (
      status in ('Draft', 'Published', 'Active', 'Completed')
    ),
  created_at timestamptz not null default now(),
  constraint elections_dates_check check (
    registration_deadline < start_datetime
    and start_datetime < end_datetime
  )
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists elections_creator_id_idx on public.elections (creator_id);
create index if not exists elections_status_idx on public.elections (status);
create index if not exists polls_election_id_idx on public.polls (election_id);

alter table public.elections enable row level security;
alter table public.polls enable row level security;

-- elections policies
drop policy if exists "Creators can insert own elections" on public.elections;
drop policy if exists "Creators can view own elections" on public.elections;
drop policy if exists "Creators can update own elections" on public.elections;
drop policy if exists "Creators can delete own draft elections" on public.elections;

create policy "Creators can insert own elections"
  on public.elections for insert to authenticated
  with check (creator_id = auth.uid());

create policy "Creators can view own elections"
  on public.elections for select to authenticated
  using (creator_id = auth.uid());

create policy "Creators can update own elections"
  on public.elections for update to authenticated
  using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

create policy "Creators can delete own draft elections"
  on public.elections for delete to authenticated
  using (creator_id = auth.uid() and status = 'Draft');

-- polls policies (via owning election)
drop policy if exists "Creators can manage polls for own elections" on public.polls;

create policy "Creators can manage polls for own elections"
  on public.polls for all to authenticated
  using (
    exists (
      select 1 from public.elections e
      where e.id = polls.election_id and e.creator_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.elections e
      where e.id = polls.election_id and e.creator_id = auth.uid()
    )
  );
