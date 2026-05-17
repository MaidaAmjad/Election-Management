import { supabase } from '../supabase/supabase';

export async function fetchLiveElectionResults(electionId, pollId = null) {
  const { data, error } = await supabase.rpc('get_live_election_results', {
    p_election_id: electionId,
    p_poll_id: pollId || null,
  });
  if (error) throw error;
  return data;
}

export async function fetchElectionResultsHistory() {
  const { data, error } = await supabase.rpc('get_election_results_history');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function finalizeElectionResults(electionId) {
  const { data, error } = await supabase.rpc('finalize_election_results', {
    p_election_id: electionId,
  });
  if (error) throw error;

  await supabase.rpc('queue_winner_notification', {
    p_election_id: electionId,
  }).catch(() => {});

  const { processScheduledEmails } = await import('./notificationService');
  await processScheduledEmails().catch(() => {});

  return data;
}

export async function lockElectionResults(electionId) {
  const { data, error } = await supabase.rpc('lock_election_results', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return data;
}

export async function unlockElectionResults(electionId) {
  const { data, error } = await supabase.rpc('unlock_election_results', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return data;
}

export async function fetchElectionsForResultsList({ creatorId, isAdmin }) {
  let query = supabase
    .from('elections')
    .select(
      'id, title, category, status, end_datetime, result_status, result_locked, turnout_percentage, winner_id',
    )
    .neq('status', 'Draft')
    .order('end_datetime', { ascending: false });

  if (!isAdmin && creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function subscribeToLiveResults(electionId, onChange) {
  const channel = supabase
    .channel(`live-results-${electionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'votes' },
      () => onChange(),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'elections',
        filter: `id=eq.${electionId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
