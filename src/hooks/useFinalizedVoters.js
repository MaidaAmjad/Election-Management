import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFinalizedVotersList } from '../services/voterFinalizationService';
import {
  filterVoters,
  paginateItems,
} from '../utils/exportVoterList';
import { FINALIZED_VOTER_PAGE_SIZE } from '../utils/finalizationConstants';

export function useFinalizedVoters(electionId) {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!electionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFinalizedVotersList(electionId);
      setVoters(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message ?? 'Failed to load voters.');
      setVoters([]);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filtered = useMemo(
    () => filterVoters(voters, { search, statusFilter }),
    [voters, search, statusFilter],
  );

  const pagination = useMemo(
    () => paginateItems(filtered, page, FINALIZED_VOTER_PAGE_SIZE),
    [filtered, page],
  );

  const statusOptions = useMemo(() => {
    const statuses = new Set(voters.map((v) => v.status));
    return ['all', ...statuses];
  }, [voters]);

  return {
    voters,
    filtered,
    pagination,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    statusOptions,
    refresh: load,
  };
}
