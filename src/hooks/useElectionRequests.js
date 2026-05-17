import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchElectionRequests } from '../services/electionApprovalService';
import { ADMIN_PAGE_SIZE } from '../utils/adminConstants';

export function useElectionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchElectionRequests(
        statusFilter ? { status: statusFilter } : {},
      );
      setRequests(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load election requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
          r.title?.toLowerCase().includes(term) ||
          r.creator_name?.toLowerCase().includes(term) ||
          r.creator_email?.toLowerCase().includes(term) ||
          r.creator_organization?.toLowerCase().includes(term) ||
          r.category?.toLowerCase().includes(term),
      );
    }

    return result;
  }, [requests, search]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  return {
    requests: paginated,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    totalItems,
    pageSize: ADMIN_PAGE_SIZE,
    refresh: load,
  };
}
