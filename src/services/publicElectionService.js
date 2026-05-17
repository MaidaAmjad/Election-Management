import { supabase } from '../supabase/supabase';
import { getPublicElectionStatus } from '../utils/publicElectionStatus';
import { fetchVoterRegistrationForElection } from './voterRegistrationService';

export async function fetchVoteCountsForElectionIds(electionIds) {
  if (!electionIds.length) return {};

  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .select('id, election_id')
    .in('election_id', electionIds);

  if (pollsError) throw pollsError;

  const pollIds = (polls ?? []).map((p) => p.id);
  if (!pollIds.length) return {};

  const { data: counts, error } = await supabase
    .from('poll_vote_counts')
    .select('poll_id, vote_count')
    .in('poll_id', pollIds);

  if (error) throw error;

  const pollToElection = Object.fromEntries(
    (polls ?? []).map((p) => [p.id, p.election_id]),
  );

  const result = {};
  (counts ?? []).forEach((row) => {
    const electionId = pollToElection[row.poll_id];
    if (electionId) {
      result[electionId] = (result[electionId] ?? 0) + Number(row.vote_count ?? 0);
    }
  });
  return result;
}

async function fetchRegistrationCountsByElectionIds(electionIds) {
  if (!electionIds.length) return {};

  const { data, error } = await supabase
    .from('voter_registrations')
    .select('election_id')
    .in('election_id', electionIds)
    .in('status', ['Registered', 'Approved']);

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
    .from('voter_registrations')
    .select('*', { count: 'exact', head: true })
    .in('status', ['Registered', 'Approved']);

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
  const counts = await fetchVoteCountsForElectionIds([electionId]);
  return counts[electionId] ?? 0;
}

export {
  fetchVoterRegistrationForElection as fetchUserRegistrationForElection,
  joinElection as registerForElection,
} from './voterRegistrationService';

export async function isUserRegisteredForElection(electionId, userId) {
  const registration = await fetchVoterRegistrationForElection(
    electionId,
    userId,
  );
  return Boolean(registration);
}

export function subscribeToVoterRegistrations(electionId, onChange) {
  const channel = supabase
    .channel(`voter-registrations-public-${electionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'voter_registrations',
        filter: `election_id=eq.${electionId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToElectionVotes(electionId, onChange) {
  const channel = supabase
    .channel(`election-votes-${electionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
      },
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
