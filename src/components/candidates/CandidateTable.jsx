import { Link } from 'react-router-dom';
import {
  HiOutlineEye,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from 'react-icons/hi2';
import { formatElectionDate } from '../../utils/electionFormatters';
import { ROUTES } from '../../utils/constants';

function truncate(text, max = 80) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export default function CandidateTable({
  candidates,
  onDelete,
  actionLoadingId,
}) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Candidate
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Designation
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Manifesto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Election
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Created
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={candidate.photo_url}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <span className="font-medium text-slate-900">
                      {candidate.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {candidate.designation}
                </td>
                <td className="max-w-xs px-4 py-3 text-sm text-slate-600">
                  {truncate(candidate.manifesto)}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {candidate.election_title}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {formatElectionDate(candidate.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <ActionLink
                      to={`${ROUTES.CREATOR_CANDIDATES}/${candidate.id}`}
                      label="View"
                      icon={HiOutlineEye}
                    />
                    <ActionLink
                      to={`${ROUTES.CREATOR_CANDIDATES}/${candidate.id}/edit`}
                      label="Edit"
                      icon={HiOutlinePencilSquare}
                    />
                    <button
                      type="button"
                      onClick={() => onDelete(candidate)}
                      disabled={actionLoadingId === candidate.id}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label={`Delete ${candidate.name}`}
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden">
        {candidates.map((candidate) => (
          <article
            key={candidate.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex gap-4">
              <img
                src={candidate.photo_url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">{candidate.name}</h3>
                <p className="text-sm text-primary-600">{candidate.designation}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {candidate.election_title}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {truncate(candidate.manifesto, 120)}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {formatElectionDate(candidate.created_at)}
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                to={`${ROUTES.CREATOR_CANDIDATES}/${candidate.id}`}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-700"
              >
                View
              </Link>
              <Link
                to={`${ROUTES.CREATOR_CANDIDATES}/${candidate.id}/edit`}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-700"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => onDelete(candidate)}
                disabled={actionLoadingId === candidate.id}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ActionLink({ to, label, icon: Icon }) {
  return (
    <Link
      to={to}
      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-600"
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
