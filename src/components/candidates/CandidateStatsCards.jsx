import {
  HiOutlineChartBar,
  HiOutlineSquares2X2,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from 'react-icons/hi2';

function StatCard({ icon: Icon, label, value, loading }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CandidateStatsCards({ stats, loading }) {
  const cards = [
    {
      icon: HiOutlineUsers,
      label: 'Total Candidates',
      value: stats.totalCandidates.toLocaleString(),
    },
    {
      icon: HiOutlineSquares2X2,
      label: 'Total Elections',
      value: stats.totalElections.toLocaleString(),
    },
    {
      icon: HiOutlineUserGroup,
      label: 'Elections with Candidates',
      value: stats.electionsWithCandidates.toLocaleString(),
    },
    {
      icon: HiOutlineChartBar,
      label: 'Avg. Candidates / Election',
      value: stats.averagePerElection.toLocaleString(),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          loading={loading}
        />
      ))}
    </div>
  );
}
