-- =============================================================================
-- Voter locking & finalization: election status, logs, RPCs, auto-lock trigger
-- =============================================================================

alter table public.elections
  add column if not exists registration_status text not null default 'Open'
    constraint elections_registration_status_check check (
      registration_status in ('Open', 'Locked', 'Finalized')
    ),
  add column if not exists locked_at timestamptz,
  add column if not exists finalized_at timestamptz;

create table if not exists public.voter_lock_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  election_id uuid not null references public.elections (id) on delete cascade,
  action_type text not null,
  previous_value text,
  new_value text,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists voter_lock_logs_election_id_idx
  on public.voter_lock_logs (election_id);
create index if not exists voter_lock_logs_admin_id_idx
  on public.voter_lock_logs (admin_id);
create index if not exists voter_lock_logs_created_at_idx
  on public.voter_lock_logs (created_at desc);
create index if not exists elections_registration_status_idx
  on public.elections (registration_status);

alter table public.voter_lock_logs enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_election_creator(p_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.elections e
    where e.id = p_election_id
      and e.creator_id = auth.uid()
  );
$$;

create or replace function public.can_finalize_election(p_election_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or public.is_election_creator(p_election_id);
$$;

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
end;
$$;

create or replace function public.auto_lock_election_if_full(p_election_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_count integer;
  v_did_lock boolean := false;
begin
  select * into v_election
  from public.elections
  where id = p_election_id
  for update;

  if not found or v_election.registration_status <> 'Open' then
    return false;
  end if;

  v_count := public.count_active_registrations(p_election_id);

  if v_count >= v_election.max_voters then
    update public.elections
    set
      registration_status = 'Locked',
      locked_at = coalesce(locked_at, now())
    where id = p_election_id;

    perform public.insert_voter_lock_log(
      null,
      p_election_id,
      'AUTO_LOCKED',
      'Open',
      'Locked',
      'Registration has been automatically locked because maximum voters have been reached.'
    );

    v_did_lock := true;
  end if;

  return v_did_lock;
end;
$$;

create or replace function public.trg_auto_lock_after_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.auto_lock_election_if_full(old.election_id);
    return old;
  end if;

  if new.status in ('Registered', 'Approved') then
    perform public.auto_lock_election_if_full(new.election_id);
  end if;

  return new;
end;
$$;

drop trigger if exists voter_registrations_auto_lock on public.voter_registrations;
create trigger voter_registrations_auto_lock
  after insert or update or delete on public.voter_registrations
  for each row
  execute function public.trg_auto_lock_after_registration();

-- ---------------------------------------------------------------------------
-- Updated register / cancel with lock & finalization rules
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
  v_registration_id uuid;
  v_auto_locked boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED', 'message', 'You must be logged in to register.');
  end if;

  select role into v_role from public.profiles where id = v_user_id;

  if v_role is distinct from 'Voter' then
    return jsonb_build_object('success', false, 'code', 'NOT_VOTER', 'message', 'Only voter accounts can register for elections.');
  end if;

  select * into v_election from public.elections where id = p_election_id;

  if not found then
    return jsonb_build_object('success', false, 'code', 'ELECTION_NOT_FOUND', 'message', 'Election not found.');
  end if;

  if v_election.registration_status = 'Finalized' then
    return jsonb_build_object('success', false, 'code', 'FINALIZED', 'message', 'Voter List Finalized');
  end if;

  if v_election.registration_status = 'Locked' then
    return jsonb_build_object('success', false, 'code', 'LOCKED', 'message', 'Registration Closed');
  end if;

  if v_election.status = 'Draft' then
    return jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'message', 'You are not eligible for this election.');
  end if;

  if v_election.status = 'Completed' or now() > v_election.end_datetime then
    return jsonb_build_object('success', false, 'code', 'ELECTION_COMPLETED', 'message', 'This election has been completed.');
  end if;

  if now() > v_election.registration_deadline then
    return jsonb_build_object('success', false, 'code', 'DEADLINE_PASSED', 'message', 'Registration deadline has passed');
  end if;

  select * into v_existing
  from public.voter_registrations
  where election_id = p_election_id and voter_id = v_user_id;

  if found then
    if v_existing.status = 'Rejected' then
      return jsonb_build_object('success', false, 'code', 'NOT_ELIGIBLE', 'message', 'You are not eligible for this election.');
    end if;
    return jsonb_build_object(
      'success', false,
      'code', 'ALREADY_JOINED',
      'message', 'You already joined this election',
      'status', v_existing.status
    );
  end if;

  v_active_count := public.count_active_registrations(p_election_id);

  if v_active_count >= v_election.max_voters then
    perform public.auto_lock_election_if_full(p_election_id);
    return jsonb_build_object(
      'success', false,
      'code', 'REGISTRATION_LOCKED',
      'message', 'Registration Closed',
      'auto_locked', true
    );
  end if;

  insert into public.voter_registrations (voter_id, election_id, status)
  values (v_user_id, p_election_id, 'Registered')
  returning id into v_registration_id;

  v_auto_locked := public.auto_lock_election_if_full(p_election_id);

  return jsonb_build_object(
    'success', true,
    'code', 'REGISTERED',
    'message', 'You are registered for this election.',
    'status', 'Registered',
    'registration_id', v_registration_id,
    'auto_locked', v_auto_locked,
    'auto_lock_message', case
      when v_auto_locked then 'Registration has been automatically locked because maximum voters have been reached.'
      else null
    end
  );
end;
$$;

create or replace function public.cancel_voter_registration(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_election public.elections%rowtype;
  v_registration public.voter_registrations%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'message', 'You must be logged in.');
  end if;

  select * into v_election from public.elections where id = p_election_id;

  if v_election.registration_status = 'Finalized' then
    return jsonb_build_object('success', false, 'message', 'Voter list is finalized and cannot be modified.');
  end if;

  select * into v_registration
  from public.voter_registrations
  where election_id = p_election_id and voter_id = v_user_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Registration not found.');
  end if;

  if v_registration.status not in ('Registered', 'Waitlisted', 'Approved') then
    return jsonb_build_object('success', false, 'message', 'This registration cannot be cancelled.');
  end if;

  delete from public.waitlist
  where election_id = p_election_id and voter_id = v_user_id;

  delete from public.voter_registrations where id = v_registration.id;

  return jsonb_build_object('success', true, 'message', 'Registration cancelled.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalize voter list
-- ---------------------------------------------------------------------------

create or replace function public.finalize_voter_list(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
begin
  if not public.can_finalize_election(p_election_id) then
    return jsonb_build_object('success', false, 'message', 'You are not allowed to finalize this election.');
  end if;

  select * into v_election from public.elections where id = p_election_id for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_election.registration_status = 'Finalized' then
    return jsonb_build_object('success', false, 'message', 'Voter list is already finalized.');
  end if;

  update public.elections
  set
    registration_status = 'Finalized',
    finalized_at = now(),
    locked_at = coalesce(locked_at, now())
  where id = p_election_id;

  perform public.insert_voter_lock_log(
    auth.uid(),
    p_election_id,
    'FINALIZED',
    v_election.registration_status,
    'Finalized',
    'Voter list finalized by authorized user.'
  );

  return jsonb_build_object(
    'success', true,
    'message', 'Voter list has been finalized.',
    'registration_status', 'Finalized'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin override RPCs (Super Admin only)
-- ---------------------------------------------------------------------------

create or replace function public.admin_unlock_registration(
  p_election_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev text;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin access required.');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('success', false, 'message', 'Override reason is required.');
  end if;

  select registration_status into v_prev
  from public.elections where id = p_election_id for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_prev = 'Finalized' then
    return jsonb_build_object('success', false, 'message', 'Cannot unlock a finalized election.');
  end if;

  update public.elections
  set registration_status = 'Open', locked_at = null
  where id = p_election_id;

  perform public.insert_voter_lock_log(
    auth.uid(), p_election_id, 'REGISTRATION_UNLOCKED', v_prev, 'Open', trim(p_reason)
  );

  return jsonb_build_object('success', true, 'message', 'Registration unlocked.', 'registration_status', 'Open');
end;
$$;

create or replace function public.admin_lock_registration(
  p_election_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev text;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin access required.');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('success', false, 'message', 'Override reason is required.');
  end if;

  select registration_status into v_prev
  from public.elections where id = p_election_id for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_prev = 'Finalized' then
    return jsonb_build_object('success', false, 'message', 'Cannot lock a finalized election.');
  end if;

  update public.elections
  set registration_status = 'Locked', locked_at = coalesce(locked_at, now())
  where id = p_election_id;

  perform public.insert_voter_lock_log(
    auth.uid(), p_election_id, 'REGISTRATION_LOCKED', v_prev, 'Locked', trim(p_reason)
  );

  return jsonb_build_object('success', true, 'message', 'Registration locked.', 'registration_status', 'Locked');
end;
$$;

create or replace function public.admin_update_max_voters(
  p_election_id uuid,
  p_new_max integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev integer;
  v_status text;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin access required.');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('success', false, 'message', 'Override reason is required.');
  end if;

  if p_new_max is null or p_new_max < 1 then
    return jsonb_build_object('success', false, 'message', 'Maximum voters must be at least 1.');
  end if;

  select max_voters, registration_status into v_prev, v_status
  from public.elections where id = p_election_id for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_status = 'Finalized' then
    return jsonb_build_object('success', false, 'message', 'Cannot change max voters on a finalized election.');
  end if;

  update public.elections set max_voters = p_new_max where id = p_election_id;

  perform public.insert_voter_lock_log(
    auth.uid(),
    p_election_id,
    'MAX_VOTERS_CHANGED',
    v_prev::text,
    p_new_max::text,
    trim(p_reason)
  );

  if public.count_active_registrations(p_election_id) >= p_new_max then
    perform public.auto_lock_election_if_full(p_election_id);
  end if;

  return jsonb_build_object('success', true, 'message', 'Maximum voter limit updated.', 'max_voters', p_new_max);
end;
$$;

create or replace function public.admin_add_voter(
  p_election_id uuid,
  p_voter_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_reg_id uuid;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin access required.');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('success', false, 'message', 'Override reason is required.');
  end if;

  select registration_status into v_status
  from public.elections where id = p_election_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_status = 'Finalized' then
    return jsonb_build_object('success', false, 'message', 'Cannot add voters to a finalized election.');
  end if;

  insert into public.voter_registrations (voter_id, election_id, status)
  values (p_voter_id, p_election_id, 'Registered')
  on conflict (election_id, voter_id) do update
    set status = 'Registered'
  returning id into v_reg_id;

  perform public.insert_voter_lock_log(
    auth.uid(),
    p_election_id,
    'MANUAL_VOTER_ADDED',
    null,
    p_voter_id::text,
    trim(p_reason)
  );

  perform public.auto_lock_election_if_full(p_election_id);

  return jsonb_build_object('success', true, 'message', 'Voter added.', 'registration_id', v_reg_id);
end;
$$;

create or replace function public.admin_remove_voter(
  p_election_id uuid,
  p_voter_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Super Admin access required.');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('success', false, 'message', 'Override reason is required.');
  end if;

  delete from public.waitlist
  where election_id = p_election_id and voter_id = p_voter_id;

  delete from public.voter_registrations
  where election_id = p_election_id and voter_id = p_voter_id;

  perform public.insert_voter_lock_log(
    auth.uid(),
    p_election_id,
    'MANUAL_VOTER_REMOVED',
    p_voter_id::text,
    null,
    trim(p_reason)
  );

  return jsonb_build_object('success', true, 'message', 'Voter removed.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalized voter list (with email from auth.users)
-- ---------------------------------------------------------------------------

create or replace function public.get_finalized_voters_list(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.can_finalize_election(p_election_id) and not public.is_super_admin() then
    raise exception 'Access denied';
  end if;

  select coalesce(jsonb_agg(row_to_json(t) order by t.registered_at), '[]'::jsonb)
  into v_result
  from (
    select
      vr.id as registration_id,
      vr.voter_id,
      vr.status,
      vr.registered_at,
      coalesce(p.full_name, 'Unknown') as voter_name,
      coalesce(u.email::text, '') as email
    from public.voter_registrations vr
    left join public.profiles p on p.id = vr.voter_id
    left join auth.users u on u.id = vr.voter_id
    where vr.election_id = p_election_id
    order by vr.registered_at asc
  ) t;

  return v_result;
end;
$$;

grant execute on function public.finalize_voter_list(uuid) to authenticated;
grant execute on function public.admin_unlock_registration(uuid, text) to authenticated;
grant execute on function public.admin_lock_registration(uuid, text) to authenticated;
grant execute on function public.admin_update_max_voters(uuid, integer, text) to authenticated;
grant execute on function public.admin_add_voter(uuid, uuid, text) to authenticated;
grant execute on function public.admin_remove_voter(uuid, uuid, text) to authenticated;
grant execute on function public.get_finalized_voters_list(uuid) to authenticated;
grant execute on function public.is_election_creator(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: voter_lock_logs
-- ---------------------------------------------------------------------------

drop policy if exists "Super Admin can view all voter lock logs" on public.voter_lock_logs;
drop policy if exists "Super Admin can insert voter lock logs" on public.voter_lock_logs;
drop policy if exists "Creators can view own election lock logs" on public.voter_lock_logs;

create policy "Super Admin can view all voter lock logs"
  on public.voter_lock_logs for select to authenticated
  using (public.is_super_admin());

create policy "Creators can view own election lock logs"
  on public.voter_lock_logs for select to authenticated
  using (public.is_election_creator(election_id));

-- Super Admin can update elections (overrides via RPC; direct update for max_voters display)
drop policy if exists "Super Admin can update all elections" on public.elections;
create policy "Super Admin can update all elections"
  on public.elections for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists "Super Admin can view all profiles" on public.profiles;
create policy "Super Admin can view all profiles"
  on public.profiles for select to authenticated
  using (public.is_super_admin());

-- Realtime: registration status changes
do $$
begin
  alter publication supabase_realtime add table public.elections;
exception
  when duplicate_object then null;
end $$;
