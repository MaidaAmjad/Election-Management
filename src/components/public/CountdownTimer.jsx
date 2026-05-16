import { useCountdown } from '../../hooks/useCountdown';
import { PUBLIC_ELECTION_STATUS } from '../../utils/publicElectionConstants';

function TimeBlock({ label, value }) {
  return (
    <div className="flex min-w-[4rem] flex-col items-center rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
      <span className="text-2xl font-bold tabular-nums text-white">{value}</span>
      <span className="text-xs uppercase tracking-wide text-primary-100">
        {label}
      </span>
    </div>
  );
}

export default function CountdownTimer({ election, variant = 'card' }) {
  const status = election?.publicStatus;
  const target =
    status === PUBLIC_ELECTION_STATUS.UPCOMING
      ? election?.start_datetime
      : status === PUBLIC_ELECTION_STATUS.ACTIVE
        ? election?.end_datetime
        : null;

  const parts = useCountdown(target);

  if (status === PUBLIC_ELECTION_STATUS.COMPLETED) {
    return (
      <p
        className={
          variant === 'inline'
            ? 'text-sm font-semibold text-slate-500'
            : 'rounded-lg bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600'
        }
      >
        Election ended
      </p>
    );
  }

  if (!parts || !target) return null;

  const label =
    status === PUBLIC_ELECTION_STATUS.UPCOMING
      ? 'Starts in'
      : 'Voting ends in';

  if (variant === 'inline') {
    return (
      <p className="text-sm text-slate-600">
        <span className="font-medium">{label}:</span>{' '}
        {parts.days}d {parts.hours}h {parts.minutes}m {parts.seconds}s
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium text-primary-100">{label}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <TimeBlock label="Days" value={String(parts.days).padStart(2, '0')} />
        <TimeBlock label="Hours" value={String(parts.hours).padStart(2, '0')} />
        <TimeBlock label="Min" value={String(parts.minutes).padStart(2, '0')} />
        <TimeBlock label="Sec" value={String(parts.seconds).padStart(2, '0')} />
      </div>
    </div>
  );
}

