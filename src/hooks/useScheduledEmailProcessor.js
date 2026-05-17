import { useEffect, useRef } from 'react';
import { processScheduledEmails } from '../services/notificationService';

const INTERVAL_MS = 5 * 60 * 1000;

/**
 * Triggers due election reminder/end/winner emails via edge function.
 * Runs once on mount and periodically while dashboard is open.
 */
export function useScheduledEmailProcessor(enabled = true) {
  const running = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;

    async function run() {
      if (running.current) return;
      running.current = true;
      try {
        await processScheduledEmails();
      } catch (err) {
        console.warn('[notifications] Scheduled email processor:', err?.message);
      } finally {
        running.current = false;
      }
    }

    run();
    const id = setInterval(run, INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled]);
}
