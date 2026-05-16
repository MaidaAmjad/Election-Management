import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/supabase';
import { fetchVoteCountsForElectionIds } from '../services/publicElectionService';

export function useLiveVoteCounts(activeElectionIds) {
  const [counts, setCounts] = useState({});
  const idKey = activeElectionIds.join(',');

  const refresh = useCallback(async () => {
    if (!activeElectionIds.length) return;
    try {
      const next = await fetchVoteCountsForElectionIds(activeElectionIds);
      setCounts(next);
    } catch {
      /* keep previous counts on transient errors */
    }
  }, [idKey, activeElectionIds]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!activeElectionIds.length) return undefined;

    const channel = supabase
      .channel('public-election-votes-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'election_votes',
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [idKey, refresh, activeElectionIds.length]);

  return counts;
}
