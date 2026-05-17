import Button from '../ui/Button';
import { formatAuditTimestamp } from '../../utils/auditFormatters';

export default function AuditLogsTable({
  rows,
  selectedIds,
  onToggleSelect,
  onView,
  onDownloadOne,
  showExportSelect,
}) {
  if (!rows.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
        No logs match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {showExportSelect && (
              <th className="w-10 px-3 py-3" aria-label="Select" />
            )}
            <th className="px-3 py-3 text-left font-medium text-slate-600">Log ID</th>
            <th className="px-3 py-3 text-left font-medium text-slate-600">User</th>
            <th className="px-3 py-3 text-left font-medium text-slate-600">Role</th>
            <th className="px-3 py-3 text-left font-medium text-slate-600">Action</th>
            <th className="px-3 py-3 text-left font-medium text-slate-600">Module</th>
            <th className="px-3 py-3 text-left font-medium text-slate-600">Timestamp</th>
            <th className="px-3 py-3 text-right font-medium text-slate-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              {showExportSelect && (
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => onToggleSelect(row.id)}
                    aria-label={`Select log ${row.id}`}
                  />
                </td>
              )}
              <td className="px-3 py-3 font-mono text-xs text-slate-600">
                {String(row.id).slice(0, 8)}…
              </td>
              <td className="px-3 py-3 font-medium text-slate-900">{row.user_name}</td>
              <td className="px-3 py-3 text-slate-600">{row.role}</td>
              <td className="px-3 py-3 text-slate-700">{row.action_type}</td>
              <td className="px-3 py-3 text-slate-600">{row.module_name}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                {formatAuditTimestamp(row.created_at)}
              </td>
              <td className="px-3 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onView(row)}>
                    View
                  </Button>
                  {onDownloadOne && (
                    <Button variant="secondary" size="sm" onClick={() => onDownloadOne(row)}>
                      Download
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
