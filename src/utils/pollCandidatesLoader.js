import { supabase } from '../supabase/supabase';

async function fetchPollsForElection(electionId) {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('election_id', electionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function fetchCandidatesForPolls(pollIds, electionId) {
  if (!pollIds.length) return [];

  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .in('poll_id', pollIds);

  if (!error) return data ?? [];

  const missingPollId =
    error.code === '42703' ||
    error.message?.includes('poll_id') ||
    error.message?.includes('schema cache');

  if (missingPollId && electionId) {
    const { data: legacy, error: legacyError } = await supabase
      .from('candidates')
      .select('*')
      .eq('election_id', electionId)
      .order('created_at', { ascending: true });

    if (legacyError) throw legacyError;
    return legacy ?? [];
  }

  throw error;
}

function attachCandidatesToPolls(polls, candidates) {
  if (!polls.length) return [];

  const byPollId = Object.fromEntries(polls.map((poll) => [poll.id, []]));

  for (const candidate of candidates) {
    const pollId = candidate.poll_id ?? polls[0]?.id;
    if (pollId && byPollId[pollId] !== undefined) {
      byPollId[pollId].push(candidate);
    }
  }

  return polls.map((poll) => ({
    ...poll,
    candidates: byPollId[poll.id] ?? [],
  }));
}

/** Loads polls and candidates without relying on PostgREST embed (polls → candidates). */
export async function loadPollsWithCandidates(electionId) {
  const polls = await fetchPollsForElection(electionId);
  const pollIds = polls.map((poll) => poll.id);
  const candidates = await fetchCandidatesForPolls(pollIds, electionId);
  return attachCandidatesToPolls(polls, candidates);
}
