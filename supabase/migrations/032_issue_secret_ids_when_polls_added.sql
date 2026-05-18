-- Issue secret IDs for all registered voters when new voting polls are added
-- (e.g. voter joined before the creator finished the Polls step).

create or replace function public.issue_secret_ids_for_all_registered_voters(
  p_election_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter_id uuid;
  v_total_voters integer := 0;
  v_total_generated integer := 0;
  v_issue jsonb;
begin
  if p_election_id is null then
    return jsonb_build_object('success', false, 'message', 'election_id is required.');
  end if;

  for v_voter_id in
    select vr.voter_id
    from public.voter_registrations vr
    where vr.election_id = p_election_id
      and vr.status in ('Registered', 'Approved')
  loop
    v_total_voters := v_total_voters + 1;
    v_issue := public.issue_secret_ids_for_voter(p_election_id, v_voter_id);
    if coalesce((v_issue->>'success')::boolean, false) then
      v_total_generated := v_total_generated
        + coalesce((v_issue->>'generated_count')::integer, 0);
    end if;
  end loop;

  return jsonb_build_object(
    'success',
    true,
    'voters_processed',
    v_total_voters,
    'generated_count',
    v_total_generated
  );
end;
$$;

grant execute on function public.issue_secret_ids_for_all_registered_voters(uuid)
  to authenticated, service_role;

create or replace function public.trg_issue_secret_ids_on_new_poll()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(NEW.is_staging, false) = false then
    perform public.issue_secret_ids_for_all_registered_voters(NEW.election_id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_poll_insert_issue_secret_ids on public.polls;

create trigger trg_poll_insert_issue_secret_ids
after insert on public.polls
for each row
execute function public.trg_issue_secret_ids_on_new_poll();
