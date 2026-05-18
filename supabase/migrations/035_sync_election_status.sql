-- =============================================================================
-- Required by get_live_election_results (034). Run if View results fails with
-- "function public.sync_election_status(uuid) does not exist".
-- =============================================================================

create or replace function public.sync_election_status(p_election_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_new_status text;
begin
  select * into v_election from public.elections where id = p_election_id;
  if not found then
    return null;
  end if;

  if v_election.status = 'Draft' then
    return v_election.status;
  end if;

  if now() > v_election.end_datetime then
    v_new_status := 'Completed';
  elsif now() >= v_election.start_datetime and now() <= v_election.end_datetime then
    v_new_status := 'Active';
  else
    v_new_status := v_election.status;
    if v_election.status = 'Completed' then
      return 'Completed';
    end if;
    return coalesce(v_election.status, 'Published');
  end if;

  if v_election.status is distinct from v_new_status then
    update public.elections
    set status = v_new_status
    where id = p_election_id;
  end if;

  return v_new_status;
end;
$$;

grant execute on function public.sync_election_status(uuid) to authenticated;
