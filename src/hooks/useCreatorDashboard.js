import { useCallback, useEffect, useState } from 'react';
import {
  fetchCreatorDashboardStats,
  fetchCreatorDashboardElections,
  fetchCreatorResultsSummary,
  subscribeDashboardRealtime,
} from '../services/dashboardService';
import { DEFAULT_PAGE_SIZE } from '../utils/electionConstants';

export function useCreatorDashboard({
  search = '',
  statusFilter = 'all',
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  const [stats, setStats] = useState(null);
  const [electionsData, setElectionsData] = useState({ rows: [], total: 0 });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsRes, electionsRes, resultsRes] = await Promise.all([
        fetchCreatorDashboardStats(),
        fetchCreatorDashboardElections({
          search,
          status: statusFilter,
          page,
          pageSize,
        }),
        fetchCreatorResultsSummary(5),
      ]);
      setStats(statsRes);
      setElectionsData({
        rows: electionsRes.rows ?? [],
        total: electionsRes.total ?? 0,
        page: electionsRes.page ?? 1,
      });
      setResults(resultsRes);
    } catch (err) {
      setError(err.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => subscribeDashboardRealtime(load), [load]);

  const totalPages = Math.max(
    1,
    Math.ceil((electionsData.total || 0) / pageSize),
  );

  return {
    stats,
    elections: electionsData.rows,
    totalElections: electionsData.total,
    totalPages,
    results,
    loading,
    error,
    refresh: load,
  };
}
