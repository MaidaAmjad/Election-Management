import { supabase } from '../supabase/supabase';
import { fetchPublicLiveResults } from './publicElectionService';
import { parseCandidates } from '../utils/resultsCalculations';

function isMissingLiveResultsRpc(error) {
  const message = error?.message ?? '';
  return (
    error?.code === 'PGRST202' ||
    message.includes('get_live_election_results') ||
    message.includes('schema cache')
  );
}

async function fetchLiveElectionResultsFallback(electionId, pollId) {
  const { data: election, error: electionError } = await supabase
    .from('elections')
    .select(
      'id, title, category, status, start_datetime, end_datetime, result_status, result_locked, turnout_percentage, winner_id',
    )
    .eq('id', electionId)
    .single();

  if (electionError) throw electionError;

  const { elections } = await fetchPublicLiveResults([electionId]);
  const published = elections[0];

  const polls = (published?.polls ?? []).map((p) => ({
    id: p.id,
    title: p.title,
  }));

  let candidates = [];
  if (pollId) {
    const poll = published?.polls?.find((p) => p.id === pollId);
    candidates = parseCandidates(poll?.candidates);
  } else if (published?.polls?.length) {
    const byId = new Map();
    published.polls.forEach((poll) => {
      parseCandidates(poll.candidates).forEach((c) => {
        const prev = byId.get(c.id) ?? { ...c, vote_count: 0 };
        prev.vote_count += c.vote_count;
        byId.set(c.id, prev);
      });
    });
    const total = [...byId.values()].reduce((sum, c) => sum + c.vote_count, 0);
    candidates = [...byId.values()]
      .map((c) => ({
        ...c,
        vote_percentage:
          total > 0 ? Math.round((c.vote_count / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.vote_count - a.vote_count)
      .map((c, index) => ({ ...c, rank: index + 1 }));
  }

  const totalVotes = candidates.reduce((sum, c) => sum + c.vote_count, 0);
  const topVotes = candidates.length ? candidates[0].vote_count : 0;
  const tiedCandidates = candidates.filter((c) => c.vote_count === topVotes && topVotes > 0);
  const isTie = tiedCandidates.length > 1;

  const { count: registered } = await supabase
    .from('voter_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', electionId)
    .in('status', ['Registered', 'Approved']);

  const turnoutPct =
    registered > 0
      ? Math.round((totalVotes / Math.max(registered, 1)) * 10000) / 100
      : 0;

  const endMs = new Date(election.end_datetime).getTime();
  const isLive =
    ['Published', 'Active'].includes(election.status) &&
    !election.result_locked &&
    Date.now() <= endMs;

  let winner = null;
  if (election.winner_id && !isTie) {
    winner = candidates.find((c) => c.id === election.winner_id) ?? null;
  }

  return {
    success: true,
    election: {
      id: election.id,
      title: election.title,
      category: election.category,
      status: election.status,
      start_datetime: election.start_datetime,
      end_datetime: election.end_datetime,
      result_status: election.result_status,
      result_locked: election.result_locked,
      turnout_percentage: election.turnout_percentage,
      winner_id: election.winner_id,
    },
    polls,
    selected_poll_id: pollId,
    candidates,
    total_votes: totalVotes,
    turnout: {
      registered_voters: registered ?? 0,
      total_votes_cast: totalVotes,
      unique_voters_voted: null,
      turnout_percentage: turnoutPct,
    },
    vote_trend: [],
    is_tie: isTie,
    winner,
    tied_candidates: isTie ? tiedCandidates : [],
    is_live: isLive,
  };
}

export async function fetchLiveElectionResults(electionId, pollId = null) {
  const params = { p_election_id: electionId };
  if (pollId) params.p_poll_id = pollId;

  const { data, error } = await supabase.rpc('get_live_election_results', params);

  if (error) {
    if (isMissingLiveResultsRpc(error)) {
      try {
        return await fetchLiveElectionResultsFallback(electionId, pollId);
      } catch (fallbackErr) {
        throw new Error(
          fallbackErr.message ??
            'Live results are unavailable. Run migration 034_ensure_get_live_election_results.sql in Supabase SQL Editor, then reload the API schema.',
        );
      }
    }
    throw error;
  }

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
