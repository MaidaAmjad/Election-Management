import { useCallback, useEffect, useState } from 'react';
import {
  fetchVoterDashboardStats,
  fetchVoterDashboardPolls,
  fetchVoterResultsSummary,
  subscribeDashboardRealtime,
} from '../services/dashboardService';

export function useVoterDashboard({ search = '', statusFilter = 'all' } = {}) {
  const [stats, setStats] = useState(null);
  const [polls, setPolls] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsRes, pollsRes, resultsRes] = await Promise.all([
        fetchVoterDashboardStats(),
        fetchVoterDashboardPolls({ search, status: statusFilter, limit: 25 }),
        fetchVoterResultsSummary(5),
      ]);
      setStats(statsRes);
      setPolls(pollsRes);
      setResults(resultsRes);
    } catch (err) {
      setError(err.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => subscribeDashboardRealtime(load), [load]);

  return { stats, polls, results, loading, error, refresh: load };
}
