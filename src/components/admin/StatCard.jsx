export default function StatCard({ label, value, icon: Icon, accent = 'primary' }) {
  const accents = {
    primary: 'bg-primary-50 text-primary-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <div
            className={`rounded-lg p-2.5 ${accents[accent] ?? accents.primary}`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 text-right sm:text-left">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}
