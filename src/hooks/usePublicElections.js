import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPublicElections } from '../services/publicElectionService';
import { PUBLIC_ELECTION_STATUS } from '../utils/publicElectionConstants';

export function usePublicElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicElections();
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

  const filtered = useMemo(() => {
    let result = [...elections];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term),
      );
    }

    if (statusFilter) {
      result = result.filter((e) => e.publicStatus === statusFilter);
    }

    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter);
    }

    if (sortBy === 'newest') {
      result.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    } else if (sortBy === 'oldest') {
      result.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
    } else if (sortBy === 'most_votes') {
      result.sort((a, b) => b.vote_count - a.vote_count);
    }

    return result;
  }, [elections, search, statusFilter, categoryFilter, sortBy]);

  const grouped = useMemo(
    () => ({
      upcoming: filtered.filter(
        (e) => e.publicStatus === PUBLIC_ELECTION_STATUS.UPCOMING,
      ),
      active: filtered.filter(
        (e) => e.publicStatus === PUBLIC_ELECTION_STATUS.ACTIVE,
      ),
      completed: filtered.filter(
        (e) => e.publicStatus === PUBLIC_ELECTION_STATUS.COMPLETED,
      ),
    }),
    [filtered],
  );

  return {
    elections: filtered,
    grouped,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    refresh: load,
  };
}
