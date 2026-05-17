import Modal from '../ui/Modal';
import { formatAuditTimestamp } from '../../utils/auditFormatters';

export default function AuditLogDetailModal({ open, onClose, log, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Log details" maxWidth="max-w-lg">
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !log ? (
        <p className="text-sm text-red-600">Log not found.</p>
      ) : (
        <dl className="space-y-3 text-sm">
          <Row label="Log ID" value={log.id} mono />
          <Row label="User" value={`${log.user_name} (${log.role})`} />
          <Row label="Action" value={log.action_type} />
          <Row label="Module" value={log.module_name} />
          <Row label="Description" value={log.description} />
          <Row label="Election" value={log.election_title ?? log.election_id ?? '—'} />
          <Row label="Poll" value={log.poll_title ?? log.poll_id ?? '—'} />
          <Row label="IP address" value={log.ip_address ?? '—'} />
          <Row label="Timestamp" value={formatAuditTimestamp(log.created_at)} />
        </dl>
      )}
    </Modal>
  );
}

function Row({ label, value, mono }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className={`mt-0.5 font-medium text-slate-900 ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
