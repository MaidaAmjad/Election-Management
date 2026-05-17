import { useCallback, useEffect, useState } from 'react';
import {
  fetchElectionVoteCount,
  fetchPublicElectionById,
  subscribeToElectionVotes,
  subscribeToVoterRegistrations,
} from '../services/publicElectionService';
import {
  fetchActiveRegistrationCount,
  fetchVoterRegistrationForElection,
} from '../services/voterRegistrationService';

export function usePublicElectionDetail(electionId, userId) {
  const [election, setElection] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [registration, setRegistration] = useState(null);
  const [activeRegistrationCount, setActiveRegistrationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshVoteCount = useCallback(async () => {
    if (!electionId) return;
    const count = await fetchElectionVoteCount(electionId);
    setVoteCount(count);
  }, [electionId]);

  const refreshRegistrationStats = useCallback(async () => {
    if (!electionId) return;
    const count = await fetchActiveRegistrationCount(electionId);
    setActiveRegistrationCount(count);
  }, [electionId]);

  const refreshUserRegistration = useCallback(async () => {
    if (!electionId || !userId) {
      setRegistration(null);
      return;
    }
    const reg = await fetchVoterRegistrationForElection(electionId, userId);
    setRegistration(reg);
  }, [electionId, userId]);

  const load = useCallback(async () => {
    if (!electionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPublicElectionById(electionId);
      setElection(data);
      setVoteCount(data.vote_count);

      const [count, reg] = await Promise.all([
        fetchActiveRegistrationCount(electionId),
        userId
          ? fetchVoterRegistrationForElection(electionId, userId)
          : Promise.resolve(null),
      ]);

      setActiveRegistrationCount(count);
      setRegistration(reg);
    } catch (err) {
      setError(err.message ?? 'Election not found.');
      setElection(null);
    } finally {
      setLoading(false);
    }
  }, [electionId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!electionId || election?.publicStatus !== 'Active') return undefined;

    const unsubscribe = subscribeToElectionVotes(electionId, () => {
      refreshVoteCount();
    });

    return unsubscribe;
  }, [electionId, election?.publicStatus, refreshVoteCount]);

  useEffect(() => {
    if (!electionId) return undefined;

    const unsubscribe = subscribeToVoterRegistrations(electionId, async () => {
      const count = await fetchActiveRegistrationCount(electionId);
      setActiveRegistrationCount(count);
      await refreshUserRegistration();
      setElection((prev) =>
        prev ? { ...prev, registered_voters_count: count } : prev,
      );
    });

    return unsubscribe;
  }, [electionId, refreshRegistrationStats, refreshUserRegistration]);

  return {
    election,
    voteCount,
    setVoteCount,
    registration,
    setRegistration,
    activeRegistrationCount,
    isRegistered: Boolean(registration),
    loading,
    error,
    refresh: load,
    refreshVoteCount,
    refreshRegistration: async () => {
      await Promise.all([
        refreshRegistrationStats(),
        refreshUserRegistration(),
        load(),
      ]);
    },
  };
}
