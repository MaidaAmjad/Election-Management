import { useCallback, useEffect, useState } from 'react';
import { fetchCandidateStats } from '../services/candidateService';

export function useCandidateStats(creatorId) {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalElections: 0,
    electionsWithCandidates: 0,
    averagePerElection: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!creatorId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCandidateStats(creatorId);
      setStats(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, error, refresh: load };
}
