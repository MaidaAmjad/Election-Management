import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchElectionResultsHistory } from '../services/resultsService';
import { RESULTS_PAGE_SIZE } from '../utils/resultsConstants';

function filterHistory(rows, { search, category, status }) {
  let result = [...rows];

  if (category && category !== 'all') {
    result = result.filter((r) => r.category === category);
  }

  if (status && status !== 'all') {
    result = result.filter((r) => r.result_status === status);
  }

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.winner?.name?.toLowerCase().includes(q),
    );
  }

  return result;
}

function sortHistory(rows, sortBy) {
  const list = [...rows];
  switch (sortBy) {
    case 'title_asc':
      return list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
    case 'votes_desc':
      return list.sort((a, b) => (b.total_votes ?? 0) - (a.total_votes ?? 0));
    case 'turnout_desc':
      return list.sort(
        (a, b) => Number(b.turnout_percentage ?? 0) - Number(a.turnout_percentage ?? 0),
      );
    case 'date_asc':
      return list.sort(
        (a, b) => new Date(a.end_datetime) - new Date(b.end_datetime),
      );
    case 'date_desc':
    default:
      return list.sort(
        (a, b) => new Date(b.end_datetime) - new Date(a.end_datetime),
      );
  }
}

export function useResultsHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchElectionResultsHistory();
      setRows(data);
    } catch (err) {
      setError(err.message ?? 'Could not load results history.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, category, status, sortBy]);

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return [...set];
  }, [rows]);

  const filtered = useMemo(
    () => sortHistory(filterHistory(rows, { search, category, status }), sortBy),
    [rows, search, category, status, sortBy],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / RESULTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * RESULTS_PAGE_SIZE,
    safePage * RESULTS_PAGE_SIZE,
  );

  return {
    rows,
    filtered,
    paginated,
    categories,
    loading,
    error,
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    sortBy,
    setSortBy,
    page: safePage,
    setPage,
    totalPages,
    refresh: load,
  };
}
