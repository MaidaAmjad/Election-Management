import { supabase } from '../supabase/supabase';

export async function fetchVotableElections() {
  const { data, error } = await supabase.rpc('get_votable_elections_for_voter');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchVotingBallot(pollId) {
  const { data, error } = await supabase.rpc('get_voting_ballot', {
    p_poll_id: pollId,
  });
  if (error) throw error;
  return data;
}

export async function validateSecretIdForVoting(secretIdText, pollId) {
  const { data, error } = await supabase.rpc('validate_secret_id_for_voting', {
    p_secret_id_text: secretIdText.trim(),
    p_poll_id: pollId,
  });
  if (error) throw error;
  return data;
}

export async function castAnonymousVote(secretIdText, pollId, candidateId) {
  const { data, error } = await supabase.rpc('cast_anonymous_vote', {
    p_secret_id_text: secretIdText.trim(),
    p_poll_id: pollId,
    p_candidate_id: candidateId,
  });
  if (error) throw error;
  return data;
}

export async function fetchMyVotingHistory() {
  const { data, error } = await supabase.rpc('get_my_voting_history');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchPollVoteCounts(pollId) {
  const { data, error } = await supabase.rpc('get_poll_vote_counts', {
    p_poll_id: pollId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function syncElectionStatus(electionId) {
  const { data, error } = await supabase.rpc('sync_election_status', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return data;
}

export function subscribeToPollVotes(pollId, onChange) {
  const channel = supabase
    .channel(`votes-poll-${pollId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `poll_id=eq.${pollId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToElectionVoteStatus(electionId, onChange) {
  const channel = supabase
    .channel(`vote-status-election-${electionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'voter_vote_status',
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToElectionStatus(electionId, onChange) {
  const channel = supabase
    .channel(`election-status-${electionId}`)
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
