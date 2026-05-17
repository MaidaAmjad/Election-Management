-- =============================================================================
-- Voter registration module: voter_registrations, waitlist, RPC helpers
-- =============================================================================

create table if not exists public.voter_registrations (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references auth.users (id) on delete cascade,
  election_id uuid not null references public.elections (id) on delete cascade,
  status text not null
    constraint voter_registrations_status_check check (
      status in ('Registered', 'Waitlisted', 'Approved', 'Rejected')
    ),
  registered_at timestamptz not null default now(),
  constraint voter_registrations_unique unique (election_id, voter_id)
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  voter_id uuid not null references auth.users (id) on delete cascade,
  election_id uuid not null references public.elections (id) on delete cascade,
  position integer not null check (position >= 1),
  created_at timestamptz not null default now(),
  constraint waitlist_election_voter_unique unique (election_id, voter_id),
  constraint waitlist_election_position_unique unique (election_id, position)
);

create index if not exists voter_registrations_voter_id_idx
  on public.voter_registrations (voter_id);
create index if not exists voter_registrations_election_id_idx
  on public.voter_registrations (election_id);
create index if not exists voter_registrations_status_idx
  on public.voter_registrations (status);
create index if not exists waitlist_election_id_idx on public.waitlist (election_id);
create index if not exists waitlist_voter_id_idx on public.waitlist (voter_id);

-- Migrate legacy registrations (idempotent)
insert into public.voter_registrations (voter_id, election_id, status, registered_at)
select er.voter_id, er.election_id, 'Registered', er.created_at
from public.election_registrations er
on conflict (election_id, voter_id) do nothing;

alter table public.voter_registrations enable row level security;
alter table public.waitlist enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.count_active_registrations(p_election_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.voter_registrations vr
  where vr.election_id = p_election_id
    and vr.status in ('Registered', 'Approved');
$$;

create or replace function public.get_voter_waitlist_position(
  p_election_id uuid,
  p_voter_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select w.position
  from public.waitlist w
  where w.election_id = p_election_id
    and w.voter_id = p_voter_id
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Register voter (atomic capacity + waitlist)
-- ---------------------------------------------------------------------------

create or replace function public.register_voter_for_election(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_election public.elections%rowtype;
  v_existing public.voter_registrations%rowtype;
  v_active_count integer;
  v_new_status text;
  v_waitlist_position integer;
  v_registration_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED', 'message', 'You must be logged in to register.');
  end if;

  select role into v_role
  from public.profiles
  where id = v_user_id;

  if v_role is distinct from 'Voter' then
    return jsonb_build_object('success', false, 'code', 'NOT_VOTER', 'message', 'Only voter accounts can register for elections.');
  end if;

  select * into v_election
  from public.elections
  where id = p_election_id;

  if not found then
    return jsonb_build_object('success', false, 'code', 'ELECTION_NOT_FOUND', 'message', 'Election not found.');
  end if;

  if v_election.status = 'Draft' then
    return jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'message', 'You are not eligible for this election.');
  end if;

  if v_election.status = 'Completed' then
    return jsonb_build_object('success', false, 'code', 'ELECTION_COMPLETED', 'message', 'This election has been completed.');
  end if;

  if now() > v_election.end_datetime then
    return jsonb_build_object('success', false, 'code', 'ELECTION_COMPLETED', 'message', 'This election has been completed.');
  end if;

  if now() > v_election.registration_deadline then
    return jsonb_build_object('success', false, 'code', 'DEADLINE_PASSED', 'message', 'Registration deadline has passed');
  end if;

  if now() >= v_election.start_datetime and now() > v_election.registration_deadline then
    return jsonb_build_object('success', false, 'code', 'REGISTRATION_CLOSED', 'message', 'Registration closed');
  end if;

  select * into v_existing
  from public.voter_registrations
  where election_id = p_election_id
    and voter_id = v_user_id;

  if found then
    if v_existing.status = 'Rejected' then
      return jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'message', 'You are not eligible for this election.');
    end if;

    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_JOINED',
      'message', 'You already joined this election',
      'status', v_existing.status,
      'waitlist_position', public.get_voter_waitlist_position(p_election_id, v_user_id)
    );
  end if;

  v_active_count := public.count_active_registrations(p_election_id);

  if v_active_count < v_election.max_voters then
    v_new_status := 'Registered';
    v_waitlist_position := null;
  else
    v_new_status := 'Waitlisted';

    select coalesce(max(w.position), 0) + 1 into v_waitlist_position
    from public.waitlist w
    where w.election_id = p_election_id;
  end if;

  insert into public.voter_registrations (voter_id, election_id, status)
  values (v_user_id, p_election_id, v_new_status)
  returning id into v_registration_id;

  if v_new_status = 'Waitlisted' then
    insert into public.waitlist (voter_id, election_id, position)
    values (v_user_id, p_election_id, v_waitlist_position);
  end if;

  if v_new_status = 'Registered' then
    return jsonb_build_object(
      'success', true,
      'code', 'REGISTERED',
      'message', 'You are registered for this election.',
      'status', v_new_status,
      'registration_id', v_registration_id
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'code', 'WAITLISTED',
    'message', 'Election is currently full. You have been added to the waitlist.',
    'status', v_new_status,
    'waitlist_position', v_waitlist_position,
    'registration_id', v_registration_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel registration (+ promote next waitlisted voter when a seat opens)
-- ---------------------------------------------------------------------------

create or replace function public.cancel_voter_registration(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_registration public.voter_registrations%rowtype;
  v_next_waitlisted record;
  v_cancelled_position integer;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'You must be logged in.');
  end if;

  select * into v_registration
  from public.voter_registrations
  where election_id = p_election_id
    and voter_id = v_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Registration not found.');
  end if;

  if v_registration.status not in ('Registered', 'Waitlisted', 'Approved') then
    return jsonb_build_object('success', false, 'message', 'This registration cannot be cancelled.');
  end if;

  if v_registration.status = 'Waitlisted' then
    select w.position into v_cancelled_position
    from public.waitlist w
    where w.election_id = p_election_id
      and w.voter_id = v_user_id;

    delete from public.waitlist
    where election_id = p_election_id
      and voter_id = v_user_id;

    delete from public.voter_registrations
    where id = v_registration.id;

    if v_cancelled_position is not null then
      update public.waitlist
      set position = position - 1
      where election_id = p_election_id
        and position > v_cancelled_position;
    end if;

    return jsonb_build_object('success', true, 'message', 'Registration cancelled.');
  end if;

  delete from public.waitlist
  where election_id = p_election_id
    and voter_id = v_user_id;

  delete from public.voter_registrations
  where id = v_registration.id;

  select vr.id, vr.voter_id, w.position
  into v_next_waitlisted
  from public.waitlist w
  join public.voter_registrations vr
    on vr.election_id = w.election_id
    and vr.voter_id = w.voter_id
    and vr.status = 'Waitlisted'
  where w.election_id = p_election_id
  order by w.position asc
  limit 1;

  if found then
    update public.voter_registrations
    set status = 'Registered'
    where id = v_next_waitlisted.id;

    delete from public.waitlist
    where election_id = p_election_id
      and voter_id = v_next_waitlisted.voter_id;

    update public.waitlist
    set position = position - 1
    where election_id = p_election_id
      and position > v_next_waitlisted.position;
  end if;

  return jsonb_build_object('success', true, 'message', 'Registration cancelled.');
end;
$$;

grant execute on function public.register_voter_for_election(uuid) to authenticated;
grant execute on function public.cancel_voter_registration(uuid) to authenticated;
grant execute on function public.count_active_registrations(uuid) to anon, authenticated;
grant execute on function public.get_voter_waitlist_position(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

drop policy if exists "Voters can create registrations" on public.voter_registrations;
create policy "Voters can create registrations"
  on public.voter_registrations for insert to authenticated
  with check (voter_id = auth.uid());

drop policy if exists "Voters can view own registrations" on public.voter_registrations;
create policy "Voters can view own registrations"
  on public.voter_registrations for select to authenticated
  using (voter_id = auth.uid());

drop policy if exists "Public can view registration counts" on public.voter_registrations;
create policy "Public can view registration counts"
  on public.voter_registrations for select
  using (true);

drop policy if exists "Voters can view own waitlist" on public.waitlist;
create policy "Voters can view own waitlist"
  on public.waitlist for select to authenticated
  using (voter_id = auth.uid());

drop policy if exists "Public can view waitlist counts" on public.waitlist;
create policy "Public can view waitlist counts"
  on public.waitlist for select
  using (true);

-- Voting requires active registration (Registered or Approved)
drop policy if exists "Voters can cast votes" on public.election_votes;
create policy "Voters can cast votes"
  on public.election_votes for insert to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.voter_registrations r
      where r.election_id = election_votes.election_id
        and r.voter_id = auth.uid()
        and r.status in ('Registered', 'Approved')
    )
  );

-- Realtime for registration statistics
do $$
begin
  alter publication supabase_realtime add table public.voter_registrations;
exception
  when duplicate_object then null;
end $$;
