import {
  HiOutlineCheckCircle,
  HiOutlineEye,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import RequestStatusBadge from './RequestStatusBadge';
import { formatElectionDate } from '../../utils/electionFormatters';

function shortId(id) {
  return id ? `${id.slice(0, 8)}…` : '—';
}

export default function RequestsTable({
  requests,
  onView,
  onApprove,
  onReject,
  actionLoadingId,
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-600">No requests match your filters.</p>
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
                'Request ID',
                'Creator',
                'Purpose',
                'Email',
                'Phone',
                'Organization',
                'Status',
                'Date',
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
            {requests.map((request) => {
              const loading = actionLoadingId === request.id;
              const isPending = request.status === 'Pending';

              return (
                <tr key={request.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {shortId(request.id)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {request.creator_name}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                    {request.purpose}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{request.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {request.phone}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {request.organization}
                  </td>
                  <td className="px-4 py-3">
                    <RequestStatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {formatElectionDate(request.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => onView(request)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                      >
                        <HiOutlineEye className="h-4 w-4" />
                        View
                      </button>
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => onApprove(request)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            <HiOutlineCheckCircle className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => onReject(request)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <HiOutlineXCircle className="h-4 w-4" />
                            Reject
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
