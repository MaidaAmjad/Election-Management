import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminDashboardStats,
  fetchAdminRecentActivity,
  subscribeDashboardRealtime,
} from '../services/dashboardService';

export function useAdminDashboard({ days = 30 } = {}) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statsData, activityData] = await Promise.all([
        fetchAdminDashboardStats(days),
        fetchAdminRecentActivity(15),
      ]);
      setStats(statsData);
      setActivity(activityData);
    } catch (err) {
      setError(err.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => subscribeDashboardRealtime(load), [load]);

  return { stats, activity, loading, error, refresh: load };
}
