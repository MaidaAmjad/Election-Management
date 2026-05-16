import { useEffect, useState } from 'react';
import { getCountdownParts } from '../utils/countdown';

export function useCountdown(targetDate) {
  const [parts, setParts] = useState(() =>
    targetDate ? getCountdownParts(targetDate) : null,
  );

  useEffect(() => {
    if (!targetDate) {
      setParts(null);
      return undefined;
    }

    function tick() {
      setParts(getCountdownParts(targetDate));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return parts;
}
