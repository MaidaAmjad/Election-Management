import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchApprovedCreatorElections } from '../services/adminElectionService';
import { ADMIN_PAGE_SIZE } from '../utils/adminConstants';

export function useApprovedElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApprovedCreatorElections();
      setElections(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load elections.');
      setElections([]);
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
    let result = elections;

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.creator_name.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term),
      );
    }

    if (statusFilter) {
      result = result.filter((e) => e.effectiveStatus === statusFilter);
    }

    return result;
  }, [elections, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));

  const paginated = useMemo(() => {
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return filtered.slice(start, start + ADMIN_PAGE_SIZE);
  }, [filtered, page]);

  return {
    elections: paginated,
    allElections: elections,
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
