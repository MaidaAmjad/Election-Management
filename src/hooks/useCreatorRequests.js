import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAllCreatorRequests } from '../services/creatorRequestService';
import { ADMIN_PAGE_SIZE } from '../utils/adminConstants';

export function useCreatorRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCreatorRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(() => {
    let result = requests;

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.creator_name.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term) ||
          r.organization.toLowerCase().includes(term) ||
          r.purpose.toLowerCase().includes(term) ||
          r.id.toLowerCase().includes(term),
      );
    }

    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    return result;
  }, [requests, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return filtered.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filtered, page]);

  return {
    requests: paginated,
    allRequests: requests,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    totalItems: filtered.length,
    pageSize: ADMIN_PAGE_SIZE,
    refresh: load,
  };
}
