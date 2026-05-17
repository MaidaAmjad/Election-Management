import { useCallback, useEffect, useState } from 'react';
import {
  fetchAuditDashboardStats,
  subscribeToAuditLogs,
} from '../services/auditLogService';

export function useAuditDashboard(days = 30) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditDashboardStats(days);
      setStats(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load transparency metrics.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeToAuditLogs(load);
  }, [load]);

  return { stats, loading, error, refresh: load };
}
