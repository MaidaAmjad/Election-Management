import { Link } from 'react-router-dom';
import {
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineRocketLaunch,
} from 'react-icons/hi2';
import ElectionStatusBadge from './ElectionStatusBadge';
import { ROUTES } from '../../utils/constants';
import { formatElectionDate } from '../../utils/electionFormatters';
import { isElectionEditable } from '../../utils/electionStatus';

export default function ElectionTable({
  elections,
  onPublish,
  onDelete,
  actionLoadingId,
}) {
  if (elections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-600">No elections match your search.</p>
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
                'Category',
                'Start',
                'End',
                'Registration',
                'Max voters',
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
            {elections.map((election) => {
              const editable = isElectionEditable(election);
              const loading = actionLoadingId === election.id;

              return (
                <tr key={election.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {election.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{election.category}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatElectionDate(election.start_datetime)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatElectionDate(election.end_datetime)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatElectionDate(election.registration_deadline)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {election.max_voters.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <ElectionStatusBadge status={election.effectiveStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        to={`${ROUTES.CREATOR_DASHBOARD}/elections/${election.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                      >
                        <HiOutlineEye className="h-4 w-4" />
                        View
                      </Link>
                      {editable && (
                        <>
                          <Link
                            to={`${ROUTES.CREATOR_DASHBOARD}/elections/${election.id}/edit`}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <HiOutlinePencilSquare className="h-4 w-4" />
                            Edit
                          </Link>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => onPublish(election)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <HiOutlineRocketLaunch className="h-4 w-4" />
                            Publish
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => onDelete(election.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
