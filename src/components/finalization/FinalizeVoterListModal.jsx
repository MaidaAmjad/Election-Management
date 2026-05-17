import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function FinalizeVoterListModal({
  open,
  onClose,
  onConfirm,
  submitting = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Finalize Voter List"
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={submitting}>
            Finalize
          </Button>
        </>
      }
    >
      <p className="text-slate-600">
        After finalization, the voter list cannot be modified. Continue?
      </p>
    </Modal>
  );
}
