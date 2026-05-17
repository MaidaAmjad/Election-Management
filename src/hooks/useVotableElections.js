import { useCallback, useEffect, useState } from 'react';
import { fetchVotableElections } from '../services/votingService';

export function useVotableElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchVotableElections();
      setElections(data);
    } catch (err) {
      setError(err.message ?? 'Could not load elections.');
      setElections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { elections, loading, error, refresh: load };
}
