export function getCountdownParts(targetDate) {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isComplete: diff <= 0 };
}

export function formatCountdownLabel(parts) {
  return `${parts.days}d ${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
}
