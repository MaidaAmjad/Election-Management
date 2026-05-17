import { formatElectionDate } from '../../utils/electionFormatters';
import { LOCK_LOG_ACTION_LABELS } from '../../utils/finalizationConstants';
import Spinner from '../ui/Spinner';

export default function VoterLockLogsPanel({ logs, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No override or lock activity recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">
              When
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">
              Actor
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">
              Action
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">
              Change
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">
              Reason
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatElectionDate(log.created_at)}
              </td>
              <td className="px-4 py-3 text-slate-900">{log.admin_name}</td>
              <td className="px-4 py-3 text-slate-900">
                {LOCK_LOG_ACTION_LABELS[log.action_type] ?? log.action_type}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {[log.previous_value, log.new_value]
                  .filter(Boolean)
                  .join(' → ') || '—'}
              </td>
              <td className="max-w-xs px-4 py-3 text-slate-600">{log.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
