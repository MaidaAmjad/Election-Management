import { useCallback, useEffect, useState } from 'react';
import { fetchMyVotingHistory } from '../services/votingService';

export function useVotingHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMyVotingHistory();
      setHistory(data);
    } catch (err) {
      setError(err.message ?? 'Could not load voting history.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { history, loading, error, refresh: load };
}
