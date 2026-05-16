import Modal from '../ui/Modal';
import RequestStatusBadge from './RequestStatusBadge';
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

export default function RequestDetailsModal({ open, request, onClose }) {
  if (!request) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Creator request details"
      maxWidth="max-w-lg"
    >
      <dl className="space-y-4">
        <DetailRow label="Full name" value={request.creator_name} />
        <DetailRow label="Email" value={request.email} />
        <DetailRow label="Phone" value={request.phone} />
        <DetailRow label="Purpose" value={request.purpose} />
        <DetailRow label="Organization" value={request.organization} />
        <DetailRow
          label="Registration date"
          value={formatElectionDate(request.profile_created_at)}
        />
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Request status
          </dt>
          <dd className="mt-2">
            <RequestStatusBadge status={request.status} />
          </dd>
        </div>
        <DetailRow
          label="Request date"
          value={formatElectionDate(request.created_at)}
        />
        {request.rejection_reason && (
          <DetailRow label="Rejection reason" value={request.rejection_reason} />
        )}
      </dl>
    </Modal>
  );
}
