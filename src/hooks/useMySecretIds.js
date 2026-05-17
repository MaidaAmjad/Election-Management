import { useCallback, useEffect, useState } from 'react';
import { fetchMyMaskedSecretIds } from '../services/secretIdService';

export function useMySecretIds() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMyMaskedSecretIds();
      setRows(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load your secret IDs.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, loading, error, refresh: load };
}
