import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function VoteConfirmationModal({
  open,
  onClose,
  electionTitle,
  candidateName,
  onConfirm,
  submitting,
}) {
  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title="Confirm your vote"
      maxWidth="max-w-lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={submitting} disabled={submitting}>
            Confirm Vote
          </Button>
        </div>
      }
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase text-slate-500">Election</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{electionTitle}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-500">
            Selected candidate
          </dt>
          <dd className="mt-0.5 font-medium text-slate-900">{candidateName}</dd>
        </div>
      </dl>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Are you sure you want to cast your vote? This action cannot be undone.
      </p>
    </Modal>
  );
}
