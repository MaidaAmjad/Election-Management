-- =============================================================================
-- Multi-role accounts: same email can be Election Creator and Voter (not Admin)
-- =============================================================================

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null
    constraint user_roles_role_check check (
      role in ('Super Admin', 'Election Creator', 'Voter')
    ),
  created_at timestamptz not null default now(),
  constraint user_roles_user_role_unique unique (user_id, role)
);

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);
create index if not exists user_roles_role_idx on public.user_roles (role);

comment on table public.user_roles is
  'Roles assigned to a single auth user. Creator and Voter may coexist; Super Admin is exclusive.';

insert into public.user_roles (user_id, role)
select p.id, p.role
from public.profiles p
where p.role is not null
on conflict (user_id, role) do nothing;

alter table public.user_roles enable row level security;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_has_role(p_user_id uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = coalesce(p_user_id, auth.uid())
      and ur.role = p_role
  );
$$;

create or replace function public.get_user_roles(p_user_id uuid default auth.uid())
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(ur.role order by ur.created_at),
    '{}'::text[]
  )
  from public.user_roles ur
  where ur.user_id = p_user_id;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_role(auth.uid(), 'Super Admin');
$$;

create or replace function public.register_additional_role(
  p_role text,
  p_full_name text default null,
  p_phone text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_roles text[];
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'NOT_AUTHENTICATED',
      'message', 'You must be signed in to register this role.'
    );
  end if;

  if p_role is null or p_role not in ('Election Creator', 'Voter') then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_ROLE',
      'message', 'Only Election Creator or Voter can be added to an existing account.'
    );
  end if;

  select array_agg(ur.role)
  into v_roles
  from public.user_roles ur
  where ur.user_id = v_user_id;

  if coalesce(v_roles, '{}') @> array['Super Admin']::text[] then
    return jsonb_build_object(
      'success', false,
      'code', 'ADMIN_EXCLUSIVE',
      'message', 'Super Admin accounts cannot register additional roles.'
    );
  end if;

  if coalesce(v_roles, '{}') @> array[p_role]::text[] then
    return jsonb_build_object(
      'success', false,
      'code', 'ROLE_ALREADY_REGISTERED',
      'message', format('You already have the %s role on this account.', p_role)
    );
  end if;

  insert into public.user_roles (user_id, role)
  values (v_user_id, p_role);

  update public.profiles
  set
    full_name = coalesce(nullif(trim(p_full_name), ''), full_name),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    role = p_role
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'roles', public.get_user_roles(v_user_id)
  );
end;
$$;

grant execute on function public.user_has_role(uuid, text) to authenticated;
grant execute on function public.get_user_roles(uuid) to authenticated;
grant execute on function public.register_additional_role(text, text, text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'Voter');
begin
  if v_role not in ('Super Admin', 'Election Creator', 'Voter') then
    v_role := 'Voter';
  end if;

  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    v_role
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone;

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Voter registration: allow users with Voter role in user_roles
create or replace function public.register_voter_for_election(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_election public.elections%rowtype;
  v_existing public.voter_registrations%rowtype;
  v_active_count integer;
  v_registration_id uuid;
  v_auto_locked boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED', 'message', 'You must be logged in to register.');
  end if;

  if not public.user_has_role(v_user_id, 'Voter') then
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
