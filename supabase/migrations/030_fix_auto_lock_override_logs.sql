-- =============================================================================
-- Fix: AUTO_LOCKED registration must not write override_logs with null admin_id.
-- Migration 015 bridged voter_lock_logs → override_logs, but auto_lock passes
-- null admin_id (system action). Only manual overrides belong in override_logs.
-- =============================================================================

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

  if p_admin_id is not null then
    perform public.insert_override_log(
      p_admin_id,
      p_action_type,
      p_previous_value,
      p_new_value,
      p_reason,
      p_election_id
    );
  else
    perform public.insert_audit_log(
      p_action_type,
      'Registration',
      format(
        '%s: %s → %s. %s',
        p_action_type,
        coalesce(p_previous_value, '—'),
        coalesce(p_new_value, '—'),
        coalesce(p_reason, '')
      ),
      p_election_id,
      null,
      null,
      null
    );
  end if;
end;
$$;

grant execute on function public.insert_voter_lock_log(uuid, uuid, text, text, text, text) to authenticated;
