import { useCallback, useEffect, useState } from 'react';
import { fetchElectionsForSecretIdManagement } from '../services/secretIdService';

export function useSecretIdElections({ creatorId, isAdmin }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchElectionsForSecretIdManagement({ creatorId, isAdmin });
      setElections(rows);
    } catch (err) {
      setError(err.message ?? 'Failed to load elections.');
      setElections([]);
    } finally {
      setLoading(false);
    }
  }, [creatorId, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  return { elections, loading, error, refresh: load };
}
