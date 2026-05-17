import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchMaskedSecretIdsForElection,
  fetchSecretLogsForElection,
  countSecretIdsForElection,
} from '../services/secretIdService';
import { SECRET_ID_PAGE_SIZE } from '../utils/secretIdConstants';

function filterRows(rows, { search, emailStatus, pollId }) {
  let result = [...rows];

  if (emailStatus && emailStatus !== 'all') {
    result = result.filter((r) => r.email_status === emailStatus);
  }

  if (pollId && pollId !== 'all') {
    result = result.filter((r) => r.poll_id === pollId);
  }

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.voter_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.poll_title?.toLowerCase().includes(q) ||
        r.masked_secret_id?.toLowerCase().includes(q),
    );
  }

  return result;
}

export function useSecretIds(electionId) {
  const [rows, setRows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [emailStatus, setEmailStatus] = useState('all');
  const [pollId, setPollId] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const load = useCallback(async () => {
    if (!electionId) return;

    setLoading(true);
    setError(null);

    try {
      const [data, logData, count] = await Promise.all([
        fetchMaskedSecretIdsForElection(electionId),
        fetchSecretLogsForElection(electionId),
        countSecretIdsForElection(electionId),
      ]);
      setRows(data);
      setLogs(logData);
      setTotalCount(count);
    } catch (err) {
      setError(err.message ?? 'Failed to load secret IDs.');
      setRows([]);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, emailStatus, pollId]);

  const filtered = useMemo(
    () => filterRows(rows, { search, emailStatus, pollId }),
    [rows, search, emailStatus, pollId],
  );

  const pollOptions = useMemo(() => {
    const polls = new Map();
    rows.forEach((r) => {
      if (r.poll_id) polls.set(r.poll_id, r.poll_title);
    });
    return [...polls.entries()].map(([id, title]) => ({ id, title }));
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / SECRET_ID_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * SECRET_ID_PAGE_SIZE,
    safePage * SECRET_ID_PAGE_SIZE,
  );

  return {
    rows,
    filtered,
    paginated,
    logs,
    loading,
    error,
    search,
    setSearch,
    emailStatus,
    setEmailStatus,
    pollId,
    setPollId,
    pollOptions,
    page: safePage,
    setPage,
    totalPages,
    totalCount,
    hasSecretIds: totalCount > 0,
    refresh: load,
  };
}
