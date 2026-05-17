import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchLiveElectionResults,
  subscribeToLiveResults,
} from '../services/resultsService';
import { parseCandidates } from '../utils/resultsCalculations';

export function useLiveResults(electionId, pollId = null) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!electionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchLiveElectionResults(electionId, pollId || null);
      if (!data?.success) {
        throw new Error(data?.message ?? 'Could not load results.');
      }
      setPayload(data);
    } catch (err) {
      setError(err.message ?? 'Could not load results.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [electionId, pollId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!electionId) return undefined;
    return subscribeToLiveResults(electionId, load);
  }, [electionId, load]);

  const candidates = useMemo(
    () => parseCandidates(payload?.candidates),
    [payload?.candidates],
  );

  const tiedCandidates = useMemo(
    () => parseCandidates(payload?.tied_candidates),
    [payload?.tied_candidates],
  );

  return {
    payload,
    election: payload?.election,
    candidates,
    tiedCandidates,
    turnout: payload?.turnout,
    voteTrend: payload?.vote_trend ?? [],
    polls: payload?.polls ?? [],
    winner: payload?.winner,
    isTie: Boolean(payload?.is_tie),
    isLive: Boolean(payload?.is_live),
    totalVotes: Number(payload?.total_votes ?? 0),
    loading,
    error,
    refresh: load,
  };
}
