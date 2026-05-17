import { HiOutlineClock, HiOutlineUserGroup } from 'react-icons/hi2';
import { useRegistrationCountdown } from '../../hooks/useRegistrationCountdown';
import {
  computeRegistrationStats,
  getRemainingRegistrationMs,
} from '../../utils/voterRegistrationValidation';

export default function ElectionRegistrationStats({
  election,
  activeCount,
  loading = false,
}) {
  const stats = computeRegistrationStats(election, activeCount);
  const remainingMs = getRemainingRegistrationMs(election);
  const countdown = useRegistrationCountdown(
    election?.registration_deadline,
    remainingMs > 0,
  );

  if (!election) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h2 className="text-lg font-semibold text-slate-900">
        Registration statistics
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Updates automatically as voters join
      </p>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={HiOutlineUserGroup}
          label="Total registered voters"
          value={loading ? '—' : stats.totalRegistered.toLocaleString()}
        />
        <StatCard
          icon={HiOutlineUserGroup}
          label="Maximum voters"
          value={stats.maxVoters.toLocaleString()}
        />
        <StatCard
          icon={HiOutlineUserGroup}
          label="Available seats"
          value={loading ? '—' : stats.availableSeats.toLocaleString()}
          highlight={stats.availableSeats > 0}
        />
        <StatCard
          icon={HiOutlineClock}
          label="Remaining registration time"
          value={
            remainingMs <= 0
              ? 'Registration closed'
              : countdown?.label ?? '—'
          }
        />
      </dl>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, highlight = false }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-white p-4">
      <Icon
        className={`h-5 w-5 shrink-0 ${highlight ? 'text-emerald-600' : 'text-primary-600'}`}
        aria-hidden="true"
      />
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </dt>
        <dd
          className={`mt-1 text-lg font-semibold tabular-nums ${
            highlight ? 'text-emerald-700' : 'text-slate-900'
          }`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}
