import { useEffect, useState } from 'react';
import { getRemainingMs } from '../../utils/votingAvailability';

function formatRemaining(ms) {
  if (ms <= 0) return '0:00:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

export default function VotingCountdown({ endDatetime, onExpired }) {
  const [remaining, setRemaining] = useState(() => getRemainingMs(endDatetime));

  useEffect(() => {
    const tick = () => {
      const ms = getRemainingMs(endDatetime);
      setRemaining(ms);
      if (ms <= 0) onExpired?.();
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endDatetime, onExpired]);

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
        Remaining time
      </p>
      <p className="mt-1 font-mono text-2xl font-bold text-primary-900">
        {formatRemaining(remaining)}
      </p>
    </div>
  );
}
