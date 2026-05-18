-- Add registration_deadline to approved-election schedule updates (037 follow-up).

drop function if exists public.update_approved_election_schedule(
  uuid,
  timestamptz,
  timestamptz,
  integer
);

create or replace function public.update_approved_election_schedule(
  p_election_id uuid,
  p_start_datetime timestamptz,
  p_end_datetime timestamptz,
  p_registration_deadline timestamptz,
  p_max_voters integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.elections%rowtype;
  v_active integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  if p_start_datetime is null
    or p_end_datetime is null
    or p_registration_deadline is null
  then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Start, end, and registration deadline are required.'
    );
  end if;

  if p_registration_deadline >= p_start_datetime then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Registration deadline must be before the election start time.'
    );
  end if;

  if p_start_datetime >= p_end_datetime then
    return jsonb_build_object('success', false, 'message', 'End date/time must be after start date/time.');
  end if;

  if p_max_voters is null or p_max_voters < 1 then
    return jsonb_build_object('success', false, 'message', 'Maximum voters must be at least 1.');
  end if;

  select * into v_row
  from public.elections
  where id = p_election_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Election not found.');
  end if;

  if v_row.creator_id is distinct from auth.uid() and not public.is_super_admin() then
    return jsonb_build_object('success', false, 'message', 'Access denied.');
  end if;

  if v_row.approval_status is distinct from 'Approved' then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Only approved elections can be updated here. Use the draft editor for unpublished elections.'
    );
  end if;

  if v_row.status = 'Draft' then
    return jsonb_build_object('success', false, 'message', 'This election is still a draft.');
  end if;

  if now() > v_row.end_datetime and p_end_datetime < v_row.end_datetime then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Cannot shorten the end time after the election has ended.'
    );
  end if;

  if now() >= v_row.start_datetime and p_start_datetime is distinct from v_row.start_datetime then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Cannot change the start time after voting has begun.'
    );
  end if;

  if now() >= v_row.start_datetime
    and p_registration_deadline is distinct from v_row.registration_deadline
  then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Cannot change the registration deadline after voting has begun.'
    );
  end if;

  v_active := public.count_active_registrations(p_election_id);

  if p_max_voters < v_active then
    return jsonb_build_object(
      'success',
      false,
      'message',
      format('Maximum voters cannot be less than current registrations (%s).', v_active)
    );
  end if;

  if v_row.registration_status = 'Finalized' then
    if p_max_voters is distinct from v_row.max_voters then
      return jsonb_build_object(
        'success',
        false,
        'message',
        'Cannot change maximum voters after the voter list is finalized.'
      );
    end if;
    if p_registration_deadline is distinct from v_row.registration_deadline then
      return jsonb_build_object(
        'success',
        false,
        'message',
        'Cannot change the registration deadline after the voter list is finalized.'
      );
    end if;
  end if;

  update public.elections
  set
    start_datetime = p_start_datetime,
    end_datetime = p_end_datetime,
    registration_deadline = p_registration_deadline,
    max_voters = p_max_voters
  where id = p_election_id;

  perform public.sync_election_status(p_election_id);

  if v_active >= p_max_voters then
    perform public.auto_lock_election_if_full(p_election_id);
  end if;

  return jsonb_build_object(
    'success',
    true,
    'message',
    'Election schedule updated.',
    'max_voters',
    p_max_voters
  );
end;
$$;

grant execute on function public.update_approved_election_schedule(
  uuid,
  timestamptz,
  timestamptz,
  timestamptz,
  integer
) to authenticated;
