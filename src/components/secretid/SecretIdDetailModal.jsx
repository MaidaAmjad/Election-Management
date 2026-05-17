import { useEffect } from 'react';
import Modal from '../ui/Modal';
import MaskedSecretId from './MaskedSecretId';
import SecretEmailStatusBadge from './SecretEmailStatusBadge';
import { formatElectionDate } from '../../utils/electionFormatters';
import { logSecretIdViewed } from '../../services/secretIdService';

export default function SecretIdDetailModal({ open, onClose, row, electionTitle }) {
  useEffect(() => {
    if (open && row?.election_id) {
      logSecretIdViewed(row.election_id, row.poll_id);
    }
  }, [open, row?.election_id, row?.poll_id]);

  if (!row) return null;

  return (
    <Modal open={open} onClose={onClose} title="Secret ID details" maxWidth="max-w-lg">
      <dl className="space-y-3 text-sm">
        <Detail label="Election" value={electionTitle} />
        <Detail label="Poll" value={row.poll_title} />
        <Detail label="Voter" value={row.voter_name} />
        <Detail label="Email" value={row.email || '—'} />
        <div>
          <dt className="text-xs font-medium uppercase text-slate-500">
            Masked secret ID
          </dt>
          <dd className="mt-1">
            <MaskedSecretId maskedValue={row.masked_secret_id} />
          </dd>
        </div>
        <Detail label="Email status">
          <SecretEmailStatusBadge status={row.email_status} />
        </Detail>
        <Detail
          label="Generated"
          value={formatElectionDate(row.generated_at)}
        />
      </dl>
    </Modal>
  );
}

function Detail({ label, value, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{children ?? value}</dd>
    </div>
  );
}
