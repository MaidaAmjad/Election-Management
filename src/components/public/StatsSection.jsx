import { usePublicElectionStats } from '../../hooks/usePublicElectionStats';

function StatCard({ label, value, loading }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-8 text-center backdrop-blur-sm">
      {loading ? (
        <div className="mx-auto h-10 w-24 animate-pulse rounded-lg bg-white/20" />
      ) : (
        <p className="text-4xl font-bold tabular-nums text-white">{value}</p>
      )}
      <p className="mt-2 text-sm font-medium text-primary-100">{label}</p>
    </div>
  );
}

export default function StatsSection() {
  const { stats, loading } = usePublicElectionStats();

  const items = [
    { label: 'Total Elections', value: stats.totalElections },
    { label: 'Active Elections', value: stats.activeElections },
    { label: 'Completed Elections', value: stats.completedElections },
    { label: 'Total Participants', value: stats.totalParticipants },
  ];

  return (
    <section className="bg-gradient-to-r from-primary-800 to-primary-900 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
          Platform at a glance
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <StatCard
              key={item.label}
              label={item.label}
              value={item.value.toLocaleString()}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
