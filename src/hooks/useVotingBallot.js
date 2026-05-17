import { useCallback, useEffect, useState } from 'react';
import {
  fetchPollVoteCounts,
  fetchVotingBallot,
  subscribeToElectionStatus,
  subscribeToPollVotes,
  syncElectionStatus,
} from '../services/votingService';

export function useVotingBallot(pollId) {
  const [ballot, setBallot] = useState(null);
  const [voteCounts, setVoteCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshCounts = useCallback(async () => {
    if (!pollId) return;
    try {
      const counts = await fetchPollVoteCounts(pollId);
      setVoteCounts(counts);
    } catch {
      /* counts are supplementary */
    }
  }, [pollId]);

  const load = useCallback(async () => {
    if (!pollId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchVotingBallot(pollId);
      if (!data?.success) {
        throw new Error(data?.message ?? 'Could not load ballot.');
      }
      if (data.election?.id) {
        await syncElectionStatus(data.election.id);
      }
      setBallot(data);
      setVoteCounts(data.vote_counts ?? []);
    } catch (err) {
      setError(err.message ?? 'Could not load ballot.');
      setBallot(null);
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!pollId || !ballot?.election?.id) return undefined;

    const electionId = ballot.election.id;
    const unsubVotes = subscribeToPollVotes(pollId, () => {
      refreshCounts();
      load();
    });
    const unsubElection = subscribeToElectionStatus(electionId, () => {
      load();
    });

    return () => {
      unsubVotes();
      unsubElection();
    };
  }, [pollId, ballot?.election?.id, load, refreshCounts]);

  return {
    ballot,
    voteCounts,
    loading,
    error,
    refresh: load,
    refreshCounts,
  };
}
