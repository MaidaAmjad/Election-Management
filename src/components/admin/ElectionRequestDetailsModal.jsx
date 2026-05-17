import Modal from '../ui/Modal';
import ElectionApprovalStatusBadge from '../elections/ElectionApprovalStatusBadge';
import { formatElectionDate } from '../../utils/electionFormatters';

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function ElectionRequestDetailsModal({ open, election, onClose }) {
  if (!election) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Election request details"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Election</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <DetailRow label="Title" value={election.title} />
            <DetailRow label="Category" value={election.category} />
            <DetailRow label="Max voters" value={String(election.max_voters)} />
            <DetailRow
              label="Submitted"
              value={formatElectionDate(election.submitted_at)}
            />
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Approval status
              </dt>
              <dd className="mt-2">
                <ElectionApprovalStatusBadge status={election.approval_status} />
              </dd>
            </div>
            {election.rejection_reason && (
              <DetailRow label="Rejection reason" value={election.rejection_reason} />
            )}
          </dl>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-slate-900">Creator details</h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <DetailRow label="Full name" value={election.creator_name} />
            <DetailRow label="Email" value={election.creator_email} />
            <DetailRow label="Phone" value={election.creator_phone} />
            <DetailRow label="Organization" value={election.creator_organization} />
            <DetailRow label="Purpose" value={election.creator_purpose} />
          </dl>
        </section>

        {election.polls?.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-900">Polls</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              {election.polls.map((poll) => (
                <li key={poll.id}>
                  {poll.title}
                  {poll.candidates?.length
                    ? ` (${poll.candidates.length} candidates)`
                    : ''}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
