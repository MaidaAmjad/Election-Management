import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabase';
import { fetchPublicLiveResults } from '../services/publicElectionService';
import { getPublicElectionStatus } from '../utils/publicElectionStatus';
import { PUBLIC_ELECTION_STATUS } from '../utils/publicElectionConstants';
import { parseCandidates } from '../utils/resultsCalculations';

function enrichElectionResults(row) {
  const polls = (row.polls ?? []).map((poll) => ({
    id: poll.id,
    title: poll.title,
    totalVotes: Number(poll.total_votes ?? 0),
    candidates: parseCandidates(poll.candidates),
  }));

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    start_datetime: row.start_datetime,
    end_datetime: row.end_datetime,
    publicStatus: getPublicElectionStatus(row),
    polls,
  };
}

export function usePublicLiveResults(elections = []) {
  const resultElections = useMemo(
    () =>
      elections.filter((e) =>
        [PUBLIC_ELECTION_STATUS.ACTIVE, PUBLIC_ELECTION_STATUS.COMPLETED].includes(
          e.publicStatus,
        ),
      ),
    [elections],
  );

  const electionIds = useMemo(
    () => resultElections.map((e) => e.id),
    [resultElections],
  );

  const idKey = electionIds.join(',');

  const [resultsById, setResultsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!electionIds.length) {
      setResultsById({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { elections: rows } = await fetchPublicLiveResults(electionIds);
      const map = {};
      rows.forEach((row) => {
        map[row.id] = enrichElectionResults(row);
      });
      setResultsById(map);
    } catch (err) {
      setError(err.message ?? 'Could not load live results.');
      setResultsById({});
    } finally {
      setLoading(false);
    }
  }, [idKey, electionIds]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!electionIds.length) return undefined;

    const channel = supabase
      .channel('public-live-results')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes' },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idKey, load, electionIds.length]);

  const enriched = useMemo(
    () =>
      resultElections.map((election) => ({
        ...election,
        results: resultsById[election.id] ?? {
          ...election,
          polls: [],
        },
      })),
    [resultElections, resultsById],
  );

  const active = useMemo(
    () =>
      enriched.filter((e) => e.publicStatus === PUBLIC_ELECTION_STATUS.ACTIVE),
    [enriched],
  );

  const completed = useMemo(
    () =>
      enriched.filter(
        (e) => e.publicStatus === PUBLIC_ELECTION_STATUS.COMPLETED,
      ),
    [enriched],
  );

  return {
    active,
    completed,
    loading,
    error,
    refresh: load,
  };
}
