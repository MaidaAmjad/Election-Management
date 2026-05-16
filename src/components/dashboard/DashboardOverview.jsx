import { useAuth } from '../../hooks/useAuth';
import { getRoleLabel } from '../../utils/roleHelpers';

export default function DashboardOverview({ title, description }) {
  const { profile, role, user } = useAuth();
  const displayName = profile?.full_name ?? user?.email ?? 'User';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-slate-600">{description}</p>
        <p className="mt-4 text-sm text-slate-500">
          Signed in as{' '}
          <span className="font-medium text-slate-800">{displayName}</span>
          {' · '}
          <span className="font-medium text-slate-800">{getRoleLabel(role)}</span>
        </p>
      </div>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Status', value: 'Active' },
          { label: 'Email', value: user?.email ?? '—' },
          { label: 'Phone', value: profile?.phone ?? '—' },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className="mt-2 truncate text-lg font-semibold text-slate-900">
              {item.value}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
