import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCandidatesByCreator } from '../services/candidateService';
import { CANDIDATE_PAGE_SIZE } from '../utils/candidateConstants';

export function useCandidates(creatorId) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [electionFilter, setElectionFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!creatorId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCandidatesByCreator(creatorId);
      setCandidates(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load candidates.');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, electionFilter, sortBy]);

  const filtered = useMemo(() => {
    let result = [...candidates];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(term));
    }

    if (electionFilter) {
      result = result.filter((c) => c.election_id === electionFilter);
    }

    if (sortBy === 'newest') {
      result.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
    } else {
      result.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at),
      );
    }

    return result;
  }, [candidates, search, electionFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / CANDIDATE_PAGE_SIZE),
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * CANDIDATE_PAGE_SIZE;
    return filtered.slice(start, start + CANDIDATE_PAGE_SIZE);
  }, [filtered, page]);

  const electionOptions = useMemo(() => {
    const map = new Map();
    candidates.forEach((c) => {
      if (!map.has(c.election_id)) {
        map.set(c.election_id, c.election_title);
      }
    });
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [candidates]);

  return {
    candidates: paginated,
    allCandidates: candidates,
    loading,
    error,
    search,
    setSearch,
    electionFilter,
    setElectionFilter,
    sortBy,
    setSortBy,
    page,
    setPage,
    totalPages,
    totalItems: filtered.length,
    pageSize: CANDIDATE_PAGE_SIZE,
    electionOptions,
    refresh: load,
  };
}
