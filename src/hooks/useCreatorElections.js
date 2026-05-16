import { useCallback, useEffect, useState } from 'react';
import { fetchElectionsByCreator } from '../services/electionService';

/** Elections owned by the creator (for candidate form dropdowns). */
export function useCreatorElections(creatorId) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!creatorId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchElectionsByCreator(creatorId);
      setElections(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load elections.');
      setElections([]);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    load();
  }, [load]);

  return { elections, loading, error, refresh: load };
}
