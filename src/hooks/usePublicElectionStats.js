import { useEffect, useState } from 'react';
import { fetchPublicElectionStats } from '../services/publicElectionService';

export function usePublicElectionStats() {
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    completedElections: 0,
    upcomingElections: 0,
    totalParticipants: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchPublicElectionStats();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) {
          setStats({
            totalElections: 0,
            activeElections: 0,
            completedElections: 0,
            upcomingElections: 0,
            totalParticipants: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}
