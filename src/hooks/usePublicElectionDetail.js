import { useCallback, useEffect, useState } from 'react';
import {
  fetchElectionVoteCount,
  fetchPublicElectionById,
  isUserRegisteredForElection,
  subscribeToElectionVotes,
} from '../services/publicElectionService';

export function usePublicElectionDetail(electionId, userId) {
  const [election, setElection] = useState(null);
  const [voteCount, setVoteCount] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshVoteCount = useCallback(async () => {
    if (!electionId) return;
    const count = await fetchElectionVoteCount(electionId);
    setVoteCount(count);
  }, [electionId]);

  const load = useCallback(async () => {
    if (!electionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPublicElectionById(electionId);
      setElection(data);
      setVoteCount(data.vote_count);

      if (userId) {
        const registered = await isUserRegisteredForElection(
          electionId,
          userId,
        );
        setIsRegistered(registered);
      } else {
        setIsRegistered(false);
      }
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

  return {
    election,
    voteCount,
    setVoteCount,
    isRegistered,
    setIsRegistered,
    loading,
    error,
    refresh: load,
    refreshVoteCount,
  };
}
