import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveRegistrationCount,
  fetchElectionFinalizationDetail,
  fetchVoterLockLogs,
  subscribeToElectionRegistrationStatus,
} from '../services/voterFinalizationService';

export function useElectionFinalization(electionId) {
  const [election, setElection] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    if (!electionId) return;
    const data = await fetchVoterLockLogs(electionId);
    setLogs(data);
  }, [electionId]);

  const refresh = useCallback(async () => {
    if (!electionId) return;

    setLoading(true);
    setError(null);

    try {
      const [electionData, count] = await Promise.all([
        fetchElectionFinalizationDetail(electionId),
        fetchActiveRegistrationCount(electionId),
      ]);
      setElection(electionData);
      setActiveCount(count);
      await loadLogs();
    } catch (err) {
      setError(err.message ?? 'Failed to load election.');
      setElection(null);
    } finally {
      setLoading(false);
    }
  }, [electionId, loadLogs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!electionId) return undefined;

    const unsubscribe = subscribeToElectionRegistrationStatus(
      electionId,
      (updated) => {
        setElection((prev) => (prev ? { ...prev, ...updated } : prev));
        fetchActiveRegistrationCount(electionId).then(setActiveCount);
      },
    );

    return unsubscribe;
  }, [electionId]);

  return {
    election,
    setElection,
    activeCount,
    logs,
    loading,
    error,
    refresh,
    refreshLogs: loadLogs,
  };
}
