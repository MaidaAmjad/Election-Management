import { formatRelativeTime } from '../../utils/formatRelativeTime';

export default function RecentActivityList({ items, loading }) {
  if (loading) {
    return (
      <ul className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="animate-pulse rounded-lg bg-slate-100 h-14" />
        ))}
      </ul>
    );
  }

  if (!items?.length) {
    return <p className="py-6 text-center text-sm text-slate-500">No recent activity.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900">{item.action_type}</p>
            <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{item.description}</p>
            <p className="mt-1 text-[10px] text-slate-400">
              {item.user_name ? `${item.user_name} · ` : ''}
              {formatRelativeTime(item.created_at)}
              {item.election_title ? ` · ${item.election_title}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
