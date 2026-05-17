-- =============================================================================
-- Election approval workflow: Pending → Admin approve/reject → Published
-- =============================================================================

alter table public.elections
  add column if not exists approval_status text
    constraint elections_approval_status_check check (
      approval_status in ('Pending', 'Approved', 'Rejected')
    ),
  add column if not exists rejection_reason text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users (id) on delete set null;

create index if not exists elections_approval_status_idx
  on public.elections (approval_status);

comment on column public.elections.approval_status is 'Pending | Approved | Rejected (null = draft not submitted)';

-- Existing live elections treated as already approved
update public.elections
set approval_status = 'Approved'
where approval_status is null
  and status <> 'Draft';

-- ---------------------------------------------------------------------------
-- RLS: super admin visibility + creator edit rules while pending
-- ---------------------------------------------------------------------------

drop policy if exists "Creators can view own elections" on public.elections;
drop policy if exists "Creators can update own elections" on public.elections;
drop policy if exists "Super admins can view all elections" on public.elections;

create policy "Creators can view own elections"
  on public.elections
  for select
  to authenticated
  using (creator_id = auth.uid());

create policy "Super admins can view all elections"
  on public.elections
  for select
  to authenticated
  using (public.is_super_admin());

create policy "Creators can update own elections"
  on public.elections
  for update
  to authenticated
  using (
    creator_id = auth.uid()
    and status = 'Draft'
    and (approval_status is null or approval_status = 'Rejected')
  )
  with check (
    creator_id = auth.uid()
    and status = 'Draft'
    and (approval_status is null or approval_status = 'Rejected')
  );

-- ---------------------------------------------------------------------------
-- Submit for admin review (creator)
-- ---------------------------------------------------------------------------

create or replace function public.submit_election_for_approval(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.elections%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  select * into v_row
  from public.elections
  where id = p_election_id and creator_id = auth.uid();

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_row.status <> 'Draft' then
    return jsonb_build_object('success', false, 'message', 'Only draft elections can be submitted.');
  end if;

  if v_row.approval_status = 'Pending' then
    return jsonb_build_object('success', false, 'message', 'This election is already pending approval.');
  end if;

  if v_row.approval_status = 'Approved' then
    return jsonb_build_object('success', false, 'message', 'This election is already approved.');
  end if;

  update public.elections
  set
    approval_status = 'Pending',
    rejection_reason = null,
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null
  where id = p_election_id;

  return jsonb_build_object('success', true, 'approval_status', 'Pending');
end;
$$;

-- ---------------------------------------------------------------------------
-- Approve / reject (super admin)
-- ---------------------------------------------------------------------------

create or replace function public.approve_election_request(p_election_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.elections%rowtype;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Only Super Admin can approve elections.');
  end if;

  select * into v_row from public.elections where id = p_election_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_row.approval_status is distinct from 'Pending' then
    return jsonb_build_object('success', false, 'message', 'Only pending elections can be approved.');
  end if;

  update public.elections
  set
    approval_status = 'Approved',
    rejection_reason = null,
    status = 'Published',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_election_id;

  return jsonb_build_object(
    'success', true,
    'election_id', p_election_id,
    'creator_id', v_row.creator_id,
    'title', v_row.title
  );
end;
$$;

create or replace function public.reject_election_request(
  p_election_id uuid,
  p_rejection_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.elections%rowtype;
  v_reason text := nullif(trim(p_rejection_reason), '');
begin
  if not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Only Super Admin can reject elections.');
  end if;

  if v_reason is null then
    return jsonb_build_object('success', false, 'message', 'Rejection reason is required.');
  end if;

  select * into v_row from public.elections where id = p_election_id;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_row.approval_status is distinct from 'Pending' then
    return jsonb_build_object('success', false, 'message', 'Only pending elections can be rejected.');
  end if;

  update public.elections
  set
    approval_status = 'Rejected',
    rejection_reason = v_reason,
    status = 'Draft',
    reviewed_at = now(),
    reviewed_by = auth.uid()
  where id = p_election_id;

  return jsonb_build_object(
    'success', true,
    'election_id', p_election_id,
    'creator_id', v_row.creator_id,
    'title', v_row.title,
    'rejection_reason', v_reason
  );
end;
$$;

grant execute on function public.submit_election_for_approval(uuid) to authenticated;
grant execute on function public.approve_election_request(uuid) to authenticated;
grant execute on function public.reject_election_request(uuid, text) to authenticated;
