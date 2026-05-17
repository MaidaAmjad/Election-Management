-- =============================================================================
-- Issue secret voting IDs when a voter registers (one per non-staging poll).
-- =============================================================================

alter table public.polls
  add column if not exists is_staging boolean not null default false;

create or replace function public.issue_secret_ids_for_voter(
  p_election_id uuid,
  p_voter_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poll record;
  v_poll_index integer := 0;
  v_seq integer;
  v_letter text;
  v_new_id text;
  v_row_id uuid;
  v_generated integer := 0;
  v_row_ids uuid[] := '{}';
  v_existing_id uuid;
begin
  if p_voter_id is null then
    return jsonb_build_object('success', false, 'message', 'Authentication required.');
  end if;

  if p_voter_id is distinct from auth.uid()
    and not public.is_super_admin()
    and not public.is_election_creator(p_election_id) then
    return jsonb_build_object('success', false, 'message', 'Access denied.');
  end if;

  if not exists (
    select 1
    from public.voter_registrations vr
    where vr.election_id = p_election_id
      and vr.voter_id = p_voter_id
      and vr.status in ('Registered', 'Approved')
  ) then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'Voter is not registered for this election.'
    );
  end if;

  for v_poll in
    select p.id, p.title
    from public.polls p
    where p.election_id = p_election_id
      and coalesce(p.is_staging, false) = false
    order by p.created_at asc, p.id asc
  loop
    select s.id into v_existing_id
    from public.secret_ids s
    where s.voter_id = p_voter_id
      and s.poll_id = v_poll.id
      and s.is_active = true
    limit 1;

    if v_existing_id is not null then
      v_row_ids := array_append(v_row_ids, v_existing_id);
      continue;
    end if;

    v_letter := public.poll_letter_from_index(v_poll_index);
    v_poll_index := v_poll_index + 1;

    select count(*)::integer into v_seq
    from public.secret_ids s
    where s.poll_id = v_poll.id;

    v_seq := v_seq + 1;
    v_new_id := format('POLL-%s-%s', v_letter, lpad(v_seq::text, 4, '0'));

    while exists (select 1 from public.secret_ids where secret_id = v_new_id) loop
      v_seq := v_seq + 1;
      v_new_id := format('POLL-%s-%s', v_letter, lpad(v_seq::text, 4, '0'));
    end loop;

    insert into public.secret_ids (
      voter_id,
      election_id,
      poll_id,
      secret_id,
      email_status
    )
    values (
      p_voter_id,
      p_election_id,
      v_poll.id,
      v_new_id,
      'Pending'
    )
    returning id into v_row_id;

    v_row_ids := array_append(v_row_ids, v_row_id);
    v_generated := v_generated + 1;
  end loop;

  return jsonb_build_object(
    'success',
    true,
    'generated_count',
    v_generated,
    'secret_row_ids',
    to_jsonb(v_row_ids)
  );
end;
$$;

-- Extend registration: issue secret IDs for registered voters (not waitlisted).
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
  v_issue jsonb;
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

  v_issue := public.issue_secret_ids_for_voter(p_election_id, v_user_id);

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
    end,
    'secret_ids_issued', coalesce((v_issue->>'generated_count')::integer, 0),
    'secret_row_ids', coalesce(v_issue->'secret_row_ids', '[]'::jsonb)
  );
end;
$$;

grant execute on function public.issue_secret_ids_for_voter(uuid, uuid) to authenticated;
grant execute on function public.register_voter_for_election(uuid) to authenticated;
