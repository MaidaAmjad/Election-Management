import Button from '../ui/Button';
import ElectionApprovalStatusBadge from '../elections/ElectionApprovalStatusBadge';
import { formatElectionDate } from '../../utils/electionFormatters';
import { ELECTION_APPROVAL_STATUS } from '../../utils/electionApprovalConstants';

export default function ElectionRequestsTable({
  elections,
  onView,
  onApprove,
  onReject,
  actionLoadingId,
}) {
  if (!elections.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-slate-600">No election requests match your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Election', 'Creator', 'Organization', 'Submitted', 'Status', 'Actions'].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {elections.map((election) => {
              const isPending =
                election.approval_status === ELECTION_APPROVAL_STATUS.PENDING;
              const loading = actionLoadingId === election.id;

              return (
                <tr key={election.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{election.title}</td>
                  <td className="px-4 py-3 text-slate-700">{election.creator_name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {election.creator_organization ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatElectionDate(election.submitted_at ?? election.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <ElectionApprovalStatusBadge status={election.approval_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onView(election)}
                      >
                        View
                      </Button>
                      {isPending && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onApprove(election)}
                            disabled={loading}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => onReject(election)}
                            disabled={loading}
                          >
                            Reject
                          </Button>
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
