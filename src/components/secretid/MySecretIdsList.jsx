import Spinner from '../ui/Spinner';
import MaskedSecretId from './MaskedSecretId';
import SecretEmailStatusBadge from './SecretEmailStatusBadge';
import { formatElectionDate } from '../../utils/electionFormatters';

export default function MySecretIdsList({ rows, loading, error }) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
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

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No secret voting IDs yet. IDs appear here after your election organizer
        finalizes the voter list and generates IDs.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Election</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Poll</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Secret ID</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Generated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-slate-900">
                {row.election_title}
              </td>
              <td className="px-4 py-3 text-slate-600">{row.poll_title}</td>
              <td className="px-4 py-3">
                <MaskedSecretId maskedValue={row.masked_secret_id} />
              </td>
              <td className="px-4 py-3">
                <SecretEmailStatusBadge status={row.email_status} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatElectionDate(row.generated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        Your full secret ID was emailed to you. Only the last four characters are shown here.
      </p>
    </div>
  );
}
