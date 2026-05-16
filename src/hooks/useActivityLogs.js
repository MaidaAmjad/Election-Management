import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchActivityLogs } from '../services/activityLogService';
import { LOGS_PAGE_SIZE } from '../utils/adminConstants';

export function useActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActivityLogs();
      setLogs(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load activity logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter]);

  const actionOptions = useMemo(() => {
    const actions = new Set(logs.map((l) => l.action));
    return [...actions].sort();
  }, [logs]);

  const filtered = useMemo(() => {
    let result = logs;

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(term) ||
          l.description.toLowerCase().includes(term) ||
          l.user_name.toLowerCase().includes(term),
      );
    }

    if (actionFilter) {
      result = result.filter((l) => l.action === actionFilter);
    }

    return result;
  }, [logs, search, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LOGS_PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * LOGS_PAGE_SIZE;
    return filtered.slice(start, start + LOGS_PAGE_SIZE);
  }, [filtered, page]);

  return {
    logs: paginated,
    allLogs: logs,
    loading,
    error,
    search,
    setSearch,
    actionFilter,
    setActionFilter,
    actionOptions,
    page,
    setPage,
    totalPages,
    totalItems: filtered.length,
    pageSize: LOGS_PAGE_SIZE,
    refresh: load,
  };
}
