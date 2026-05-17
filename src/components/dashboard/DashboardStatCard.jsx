export default function DashboardStatCard({
  label,
  value,
  icon: Icon,
  accent = 'primary',
  trend,
}) {
  const accents = {
    primary: 'bg-primary-50 text-primary-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    blue: 'bg-blue-50 text-blue-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <div className={`rounded-xl p-3 ${accents[accent] ?? accents.primary}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend ? <p className="mt-1 text-xs text-slate-500">{trend}</p> : null}
        </div>
      </div>
    </article>
  );
}
