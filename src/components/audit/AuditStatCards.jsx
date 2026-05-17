export default function AuditStatCards({ stats }) {
  const cards = [
    { label: 'Total log entries', value: stats?.total_logs ?? 0 },
    { label: 'Login activities', value: stats?.login_activities ?? 0 },
    { label: 'Total votes cast', value: stats?.total_votes_cast ?? 0 },
    { label: 'Elections created', value: stats?.elections_created ?? 0 },
    { label: 'Approvals', value: stats?.approvals ?? 0 },
    { label: 'Overrides', value: stats?.overrides ?? 0 },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {c.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
