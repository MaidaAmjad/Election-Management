import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveRegistrationCount,
  fetchVoterRegistrationForElection,
  subscribeToVoterRegistrations,
} from '../services/voterRegistrationService';
export function useVoterRegistration(electionId, voterId) {
  const [registration, setRegistration] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!electionId) return;

    try {
      const [reg, count] = await Promise.all([
        voterId
          ? fetchVoterRegistrationForElection(electionId, voterId)
          : Promise.resolve(null),
        fetchActiveRegistrationCount(electionId),
      ]);
      setRegistration(reg);
      setActiveCount(count);
      setError(null);
    } catch (err) {
      setError(err.message ?? 'Could not load registration data.');
    }
  }, [electionId, voterId]);

  const load = useCallback(async () => {
    if (!electionId) return;

    setLoading(true);
    setError(null);

    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [electionId, refresh]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!electionId) return undefined;

    const unsubscribe = subscribeToVoterRegistrations(electionId, () => {
      refresh();
    });

    return unsubscribe;
  }, [electionId, refresh]);

  return {
    registration,
    setRegistration,
    activeCount,
    loading,
    error,
    refresh,
  };
}
