import { Link } from 'react-router-dom';

export default function QuickActionGrid({ actions }) {
  if (!actions?.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        const className =
          'flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-800';

        if (action.onClick) {
          return (
            <button key={action.label} type="button" onClick={action.onClick} className={className}>
              {Icon ? <Icon className="h-5 w-5 shrink-0 text-primary-600" /> : null}
              {action.label}
            </button>
          );
        }

        return (
          <Link key={action.label} to={action.to} className={className}>
            {Icon ? <Icon className="h-5 w-5 shrink-0 text-primary-600" /> : null}
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
