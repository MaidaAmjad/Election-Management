import { supabase } from '../supabase/supabase';

async function fetchPollsForElection(electionId) {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('election_id', electionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map((poll) => ({
    ...poll,
    isStaging: Boolean(poll.is_staging),
    allowMultipleAnswers: Boolean(poll.allow_multiple_answers),
  }));
}

async function fetchCandidatesForElection(electionId) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('election_id', electionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function fetchPollOptions(pollIds) {
  if (!pollIds.length) return [];

  const { data, error } = await supabase
    .from('poll_options')
    .select('poll_id, candidate_id')
    .in('poll_id', pollIds);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('poll_options')) {
      return [];
    }
    throw error;
  }

  return data ?? [];
}

function attachCandidatesToPolls(polls, allCandidates, pollOptions) {
  if (!polls.length) return [];

  const candidateById = Object.fromEntries(allCandidates.map((c) => [c.id, c]));
  const optionsByPollId = {};

  for (const row of pollOptions) {
    if (!optionsByPollId[row.poll_id]) optionsByPollId[row.poll_id] = [];
    const candidate = candidateById[row.candidate_id];
    if (candidate) optionsByPollId[row.poll_id].push(candidate);
  }

  const stagingPoll = polls.find((p) => p.isStaging) ?? polls[0];
  const stagingId = stagingPoll?.id;

  return polls.map((poll) => {
    const fromOptions = optionsByPollId[poll.id] ?? [];
    const fromPollId = allCandidates.filter((c) => c.poll_id === poll.id);
    const poolOnStaging =
      poll.isStaging || poll.id === stagingId
        ? allCandidates.filter((c) => c.poll_id === stagingId)
        : [];

    let candidates = fromOptions.length > 0 ? fromOptions : fromPollId;
    if (poll.isStaging) {
      candidates = poolOnStaging.length > 0 ? poolOnStaging : fromPollId;
    }

    return {
      ...poll,
      candidates,
      optionCandidateIds: fromOptions.length > 0 ? fromOptions.map((c) => c.id) : [],
    };
  });
}

/** Loads polls, candidate pool, and poll option assignments without PostgREST embeds. */
export async function loadPollsWithCandidates(electionId) {
  const polls = await fetchPollsForElection(electionId);
  const nonStagingIds = polls.filter((p) => !p.isStaging).map((p) => p.id);
  const [allCandidates, pollOptions] = await Promise.all([
    fetchCandidatesForElection(electionId),
    fetchPollOptions(nonStagingIds),
  ]);
  return attachCandidatesToPolls(polls, allCandidates, pollOptions);
}

export function getStagingPoll(polls) {
  return polls.find((p) => p.isStaging) ?? polls[0] ?? null;
}

export function getDisplayPolls(polls) {
  return polls.filter((p) => !p.isStaging);
}
