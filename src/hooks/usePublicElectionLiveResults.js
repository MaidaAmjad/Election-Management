import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase/supabase';
import { fetchPublicLiveResults } from '../services/publicElectionService';
import { PUBLIC_ELECTION_STATUS } from '../utils/publicElectionConstants';
import { parseCandidates } from '../utils/resultsCalculations';

function enrichPolls(row) {
  return (row?.polls ?? []).map((poll) => ({
    id: poll.id,
    title: poll.title,
    totalVotes: Number(poll.total_votes ?? 0),
    candidates: parseCandidates(poll.candidates),
  }));
}

export function usePublicElectionLiveResults(electionId, publicStatus) {
  const enabled = useMemo(
    () =>
      Boolean(electionId) &&
      [PUBLIC_ELECTION_STATUS.ACTIVE, PUBLIC_ELECTION_STATUS.COMPLETED].includes(
        publicStatus,
      ),
    [electionId, publicStatus],
  );

  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setPolls([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { elections } = await fetchPublicLiveResults([electionId]);
      const row = elections.find((e) => e.id === electionId);
      setPolls(enrichPolls(row));
    } catch (err) {
      setError(err.message ?? 'Could not load results.');
      setPolls([]);
    } finally {
      setLoading(false);
    }
  }, [electionId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return undefined;

    const channel = supabase
      .channel(`public-election-results-${electionId}`)
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
  }, [electionId, enabled, load]);

  return { polls, loading, error, refresh: load, enabled };
}
