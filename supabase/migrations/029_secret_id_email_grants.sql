-- Grants + helpers so send-email (service role) can issue IDs and update status on registration.

create or replace function public.poll_letter_from_index(p_index integer)
returns text
language plpgsql
immutable
as $$
begin
  return chr(65 + (abs(p_index) % 26));
end;
$$;

-- Re-apply issue function (safe if 028 already ran) with inline letter helper fallback
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
exception
  when undefined_table then
    return jsonb_build_object(
      'success',
      false,
      'message',
      'secret_ids table is missing. Run migrations 012 and 025 in Supabase SQL Editor.'
    );
end;
$$;

grant execute on function public.poll_letter_from_index(integer) to authenticated, service_role;
grant execute on function public.issue_secret_ids_for_voter(uuid, uuid) to authenticated, service_role;
grant execute on function public.update_secret_id_email_status(uuid, text, text) to service_role;
grant execute on function public.insert_secret_log(uuid, uuid, uuid, text) to service_role;
