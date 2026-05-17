import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveRegistrationCount,
  fetchElectionsForFinalization,
} from '../services/voterFinalizationService';

export function useFinalizationElections({ creatorId, isAdmin }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const rows = await fetchElectionsForFinalization({ creatorId, isAdmin });
      const enriched = await Promise.all(
        rows.map(async (election) => {
          const count = await fetchActiveRegistrationCount(election.id);
          return { ...election, registered_count: count };
        }),
      );
      setElections(enriched);
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
