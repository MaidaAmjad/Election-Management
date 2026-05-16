import { supabase } from '../supabase/supabase';
import { getPublicElectionStatus } from '../utils/publicElectionStatus';

export async function fetchVoteCountsForElectionIds(electionIds) {
  if (!electionIds.length) return {};

  const { data, error } = await supabase
    .from('election_votes')
    .select('election_id')
    .in('election_id', electionIds);

  if (error) throw error;

  const counts = {};
  (data ?? []).forEach((row) => {
    counts[row.election_id] = (counts[row.election_id] ?? 0) + 1;
  });
  return counts;
}

async function fetchRegistrationCountsByElectionIds(electionIds) {
  if (!electionIds.length) return {};

  const { data, error } = await supabase
    .from('election_registrations')
    .select('election_id')
    .in('election_id', electionIds);

  if (error) throw error;

  const counts = {};
  (data ?? []).forEach((row) => {
    counts[row.election_id] = (counts[row.election_id] ?? 0) + 1;
  });
  return counts;
}

async function fetchCreatorNames(creatorIds) {
  if (!creatorIds.length) return {};

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', creatorIds);

  if (error) throw error;

  return Object.fromEntries(
    (data ?? []).map((p) => [p.id, p.full_name ?? 'Unknown']),
  );
}

function enrichElection(row, voteCounts, regCounts, creatorNames) {
  const election = { ...row };
  return {
    ...election,
    creator_name: creatorNames[row.creator_id] ?? 'Unknown',
    vote_count: voteCounts[row.id] ?? 0,
    registered_voters_count: regCounts[row.id] ?? 0,
    publicStatus: getPublicElectionStatus(election),
  };
}

export async function fetchPublicElections() {
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .neq('status', 'Draft')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const elections = data ?? [];
  const ids = elections.map((e) => e.id);
  const creatorIds = [...new Set(elections.map((e) => e.creator_id))];

  const [voteCounts, regCounts, creatorNames] = await Promise.all([
    fetchVoteCountsForElectionIds(ids),
    fetchRegistrationCountsByElectionIds(ids),
    fetchCreatorNames(creatorIds),
  ]);

  return elections.map((row) =>
    enrichElection(row, voteCounts, regCounts, creatorNames),
  );
}

export async function fetchPublicElectionById(electionId) {
  const { data, error } = await supabase
    .from('elections')
    .select('*, polls(*, poll_candidates(*))')
    .eq('id', electionId)
    .neq('status', 'Draft')
    .single();

  if (error) throw error;

  const { polls, ...electionRow } = data;
  const pollsList = polls ?? [];

  const candidateCount = pollsList.reduce(
    (sum, poll) => sum + (poll.poll_candidates?.length ?? 0),
    0,
  );

  const [voteCounts, regCounts, creatorNames] = await Promise.all([
    fetchVoteCountsForElectionIds([electionId]),
    fetchRegistrationCountsByElectionIds([electionId]),
    fetchCreatorNames([electionRow.creator_id]),
  ]);

  const election = enrichElection(
    electionRow,
    voteCounts,
    regCounts,
    creatorNames,
  );

  return {
    ...election,
    polls: pollsList,
    candidate_count: candidateCount,
  };
}

export async function fetchPublicElectionStats() {
  const elections = await fetchPublicElections();

  const upcoming = elections.filter(
    (e) => e.publicStatus === 'Upcoming',
  ).length;
  const active = elections.filter((e) => e.publicStatus === 'Active').length;
  const completed = elections.filter(
    (e) => e.publicStatus === 'Completed',
  ).length;

  const { count: participants, error } = await supabase
    .from('election_registrations')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;

  return {
    totalElections: elections.length,
    activeElections: active,
    completedElections: completed,
    upcomingElections: upcoming,
    totalParticipants: participants ?? 0,
  };
}

export async function fetchElectionVoteCount(electionId) {
  const { count, error } = await supabase
    .from('election_votes')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', electionId);

  if (error) throw error;
  return count ?? 0;
}

export async function isUserRegisteredForElection(electionId, userId) {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('election_registrations')
    .select('id')
    .eq('election_id', electionId)
    .eq('voter_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function registerForElection(electionId, userId) {
  const { error } = await supabase.from('election_registrations').insert({
    election_id: electionId,
    voter_id: userId,
  });

  if (error) throw error;
}

export function subscribeToElectionVotes(electionId, onChange) {
  const channel = supabase
    .channel(`election-votes-${electionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'election_votes',
        filter: `election_id=eq.${electionId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
