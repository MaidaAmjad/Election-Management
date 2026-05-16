-- =============================================================================
-- Election Management — creator requests & activity logs
-- =============================================================================

create table if not exists public.creator_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null,
  email text not null,
  phone text not null,
  organization text not null,
  status text not null default 'Pending'
    constraint creator_requests_status_check check (
      status in ('Pending', 'Approved', 'Rejected')
    ),
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists creator_requests_user_id_idx on public.creator_requests (user_id);
create index if not exists creator_requests_status_idx on public.creator_requests (status);
create index if not exists creator_requests_created_at_idx on public.creator_requests (created_at desc);
create index if not exists activity_logs_user_id_idx on public.activity_logs (user_id);
create index if not exists activity_logs_action_idx on public.activity_logs (action);
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);

alter table public.creator_requests enable row level security;
alter table public.activity_logs enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Super Admin'
  );
$$;

-- creator_requests policies
drop policy if exists "Users can create own creator requests" on public.creator_requests;
drop policy if exists "Users can view own creator requests" on public.creator_requests;
drop policy if exists "Super Admin can view all creator requests" on public.creator_requests;
drop policy if exists "Super Admin can update creator requests" on public.creator_requests;

create policy "Users can create own creator requests"
  on public.creator_requests for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can view own creator requests"
  on public.creator_requests for select to authenticated
  using (user_id = auth.uid());

create policy "Super Admin can view all creator requests"
  on public.creator_requests for select to authenticated
  using (public.is_super_admin());

create policy "Super Admin can update creator requests"
  on public.creator_requests for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- activity_logs policies
drop policy if exists "Authenticated users can insert activity logs" on public.activity_logs;
drop policy if exists "Super Admin can view all activity logs" on public.activity_logs;

create policy "Authenticated users can insert activity logs"
  on public.activity_logs for insert to authenticated
  with check (user_id = auth.uid() or public.is_super_admin());

create policy "Super Admin can view all activity logs"
  on public.activity_logs for select to authenticated
  using (public.is_super_admin());

-- Super Admin read access for approved elections overview
drop policy if exists "Super Admin can view all elections" on public.elections;
drop policy if exists "Super Admin can view all polls" on public.polls;

create policy "Super Admin can view all elections"
  on public.elections for select to authenticated
  using (public.is_super_admin());

create policy "Super Admin can view all polls"
  on public.polls for select to authenticated
  using (public.is_super_admin());
