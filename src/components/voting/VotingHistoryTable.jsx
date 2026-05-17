import Spinner from '../ui/Spinner';
import { formatElectionDate } from '../../utils/electionFormatters';

export default function VotingHistoryTable({ history, loading, error }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!history.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
        You have not cast any votes yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Election</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Poll</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Voting date</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-slate-900">
                {row.election_title}
              </td>
              <td className="px-4 py-3 text-slate-600">{row.poll_title}</td>
              <td className="px-4 py-3 text-slate-600">
                {row.voted_at ? formatElectionDate(row.voted_at) : '—'}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        Your ballot choices are anonymous and are not shown here.
      </p>
    </div>
  );
}
