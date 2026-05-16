import Modal from '../ui/Modal';
import ElectionStatusBadge from '../elections/ElectionStatusBadge';
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

export default function AdminElectionDetailModal({
  open,
  election,
  onClose,
  loading,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={election?.title ?? 'Election details'}
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <p className="text-sm text-slate-500">Loading election details…</p>
      ) : election ? (
        <div className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Creator" value={election.creator_name} />
            <DetailRow label="Category" value={election.category} />
            <DetailRow
              label="Start"
              value={formatElectionDate(election.start_datetime)}
            />
            <DetailRow
              label="End"
              value={formatElectionDate(election.end_datetime)}
            />
            <DetailRow
              label="Registration deadline"
              value={formatElectionDate(election.registration_deadline)}
            />
            <DetailRow label="Max voters" value={election.max_voters} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </dt>
              <dd className="mt-2">
                <ElectionStatusBadge status={election.effectiveStatus} />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Description
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{election.description}</dd>
            </div>
          </dl>

          {election.polls?.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Polls</h3>
              <ul className="space-y-3">
                {election.polls.map((poll) => (
                  <li
                    key={poll.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="font-medium text-slate-900">{poll.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{poll.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Election not found.</p>
      )}
    </Modal>
  );
}
