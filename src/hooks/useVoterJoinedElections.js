import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  cancelVoterRegistration,
  fetchVoterJoinedElections,
} from '../services/voterRegistrationService';

export function useVoterJoinedElections(voterId) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async () => {
    if (!voterId) {
      setElections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchVoterJoinedElections(voterId);
      setElections(data);
    } catch (err) {
      setError(err.message ?? 'Could not load your elections.');
      setElections([]);
    } finally {
      setLoading(false);
    }
  }, [voterId]);

  useEffect(() => {
    load();
  }, [load]);

  const cancelRegistration = useCallback(
    async (electionId) => {
      setCancellingId(electionId);
      try {
        const result = await cancelVoterRegistration(electionId);
        if (!result?.success) {
          toast.error(result?.message ?? 'Could not cancel registration.');
          return;
        }
        toast.success(result.message ?? 'Registration cancelled.');
        await load();
      } catch (err) {
        toast.error(err.message ?? 'Could not cancel registration.');
      } finally {
        setCancellingId(null);
      }
    },
    [load],
  );

  return {
    elections,
    loading,
    error,
    refresh: load,
    cancelRegistration,
    cancellingId,
  };
}
