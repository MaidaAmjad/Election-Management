import { useCallback, useEffect, useState } from 'react';
import { searchNotifications } from '../services/notificationService';

export function useNotificationCenter({
  search = '',
  type = 'all',
  readFilter = 'all',
  pageSize = 15,
} = {}) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchNotifications({
        search,
        type,
        readFilter,
        page,
        pageSize,
      });
      setRows(result.rows ?? []);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(err.message ?? 'Failed to load notifications');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, type, readFilter, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, type, readFilter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    refresh: load,
  };
}
