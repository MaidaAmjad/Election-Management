import { HiOutlineEye } from 'react-icons/hi2';
import ElectionStatusBadge from '../elections/ElectionStatusBadge';
import { formatElectionDate } from '../../utils/electionFormatters';

export default function ApprovedElectionsTable({ elections, onView }) {
  if (elections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-600">No elections from approved creators yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Title',
                'Creator',
                'Category',
                'Start',
                'End',
                'Status',
                'Actions',
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {elections.map((election) => (
              <tr key={election.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {election.title}
                </td>
                <td className="px-4 py-3 text-slate-600">{election.creator_name}</td>
                <td className="px-4 py-3 text-slate-600">{election.category}</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {formatElectionDate(election.start_datetime)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                  {formatElectionDate(election.end_datetime)}
                </td>
                <td className="px-4 py-3">
                  <ElectionStatusBadge status={election.effectiveStatus} />
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onView(election)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                  >
                    <HiOutlineEye className="h-4 w-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
