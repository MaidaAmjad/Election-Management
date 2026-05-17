import { formatElectionDate } from '../../utils/electionFormatters';

export default function SecretIdLogsPanel({ logs }) {
  if (!logs?.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No secret ID activity logged yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">When</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatElectionDate(log.created_at)}
              </td>
              <td className="px-4 py-3 text-slate-900">{log.user_name}</td>
              <td className="px-4 py-3 text-slate-700">{log.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
