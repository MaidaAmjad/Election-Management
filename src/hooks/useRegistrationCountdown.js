import { useEffect, useState } from 'react';

function formatRemaining(ms) {
  if (ms <= 0) return 'Registration closed';

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`);

  return parts.join(' ');
}

export function useRegistrationCountdown(deadline, active = true) {
  const [label, setLabel] = useState(null);

  useEffect(() => {
    if (!deadline || !active) {
      setLabel('Registration closed');
      return undefined;
    }

    function tick() {
      const ms = new Date(deadline).getTime() - Date.now();
      setLabel(formatRemaining(ms));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline, active]);

  return { label };
}
