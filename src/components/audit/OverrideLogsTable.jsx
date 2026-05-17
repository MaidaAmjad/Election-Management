import { formatAuditTimestamp } from '../../utils/auditFormatters';

export default function OverrideLogsTable({ rows }) {
  if (!rows?.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
        No override logs recorded.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-xl border border-amber-200 bg-amber-50/50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{row.admin_name ?? 'Admin'}</p>
              <p className="text-sm text-amber-900">{row.action}</p>
            </div>
            <p className="text-xs text-slate-500">{formatAuditTimestamp(row.created_at)}</p>
          </div>
          {row.election_title && (
            <p className="mt-2 text-sm text-slate-600">Election: {row.election_title}</p>
          )}
          <p className="mt-2 text-sm font-medium text-slate-800">
            {row.previous_value ?? '—'} → {row.new_value ?? '—'}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Reason:</span> {row.reason}
          </p>
        </article>
      ))}
    </div>
  );
}
