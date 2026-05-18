import { supabase } from '../supabase/supabase';

export async function fetchElectionsForFinalization({ creatorId, isAdmin }) {
  let query = supabase
    .from('elections')
    .select(
      'id, title, status, registration_status, locked_at, finalized_at, max_voters, created_at, creator_id',
    )
    .neq('status', 'Draft')
    .order('created_at', { ascending: false });

  if (!isAdmin && creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchElectionFinalizationDetail(electionId) {
  const { data, error } = await supabase
    .from('elections')
    .select(
      'id, title, status, registration_status, locked_at, finalized_at, max_voters, registration_deadline, creator_id',
    )
    .eq('id', electionId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchActiveRegistrationCount(electionId) {
  const { count, error } = await supabase
    .from('voter_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', electionId)
    .in('status', ['Registered', 'Approved']);

  if (error) throw error;
  return count ?? 0;
}

export async function finalizeVoterList(electionId) {
  const { data, error } = await supabase.rpc('finalize_voter_list', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return data;
}

export async function fetchFinalizedVotersList(electionId) {
  const { data, error } = await supabase.rpc('get_finalized_voters_list', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchVoterLockLogs(electionId) {
  const { data, error } = await supabase
    .from('voter_lock_logs')
    .select(
      'id, admin_id, election_id, action_type, previous_value, new_value, reason, created_at',
    )
    .eq('election_id', electionId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const adminIds = [...new Set(rows.map((row) => row.admin_id).filter(Boolean))];

  let nameById = {};
  if (adminIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', adminIds);

    if (profileError) throw profileError;
    nameById = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.full_name]),
    );
  }

  return rows.map((row) => ({
    ...row,
    admin_name:
      (row.admin_id && nameById[row.admin_id]) ??
      (row.admin_id ? 'Admin' : 'System'),
  }));
}

export async function adminUnlockRegistration(electionId, reason) {
  const { data, error } = await supabase.rpc('admin_unlock_registration', {
    p_election_id: electionId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function adminLockRegistration(electionId, reason) {
  const { data, error } = await supabase.rpc('admin_lock_registration', {
    p_election_id: electionId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function adminUpdateMaxVoters(electionId, newMax, reason) {
  const { data, error } = await supabase.rpc('admin_update_max_voters', {
    p_election_id: electionId,
    p_new_max: newMax,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function adminAddVoter(electionId, voterId, reason) {
  const { data, error } = await supabase.rpc('admin_add_voter', {
    p_election_id: electionId,
    p_voter_id: voterId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function adminRemoveVoter(electionId, voterId, reason) {
  const { data, error } = await supabase.rpc('admin_remove_voter', {
    p_election_id: electionId,
    p_voter_id: voterId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function searchVoterProfiles(query) {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role')
    .eq('role', 'Voter')
    .or(`full_name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
    .limit(10);

  if (error) throw error;
  return data ?? [];
}

export function subscribeToElectionRegistrationStatus(electionId, onChange) {
  const channel = supabase
    .channel(`election-reg-status-${electionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'elections',
        filter: `id=eq.${electionId}`,
      },
      (payload) => onChange(payload.new),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
