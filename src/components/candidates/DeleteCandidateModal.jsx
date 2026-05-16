import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function DeleteCandidateModal({
  open,
  onClose,
  onConfirm,
  candidateName,
  submitting,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete candidate"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <p className="text-slate-600">
        Are you sure you want to delete this candidate?
        {candidateName && (
          <span className="mt-2 block font-semibold text-slate-900">
            {candidateName}
          </span>
        )}
      </p>
      <p className="mt-3 text-sm text-slate-500">
        This will remove the candidate record and their photo from storage.
      </p>
    </Modal>
  );
}
