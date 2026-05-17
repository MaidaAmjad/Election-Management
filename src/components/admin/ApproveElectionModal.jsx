import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function ApproveElectionModal({
  open,
  election,
  onClose,
  onConfirm,
  isLoading,
}) {
  return (
    <Modal
      open={open}
      onClose={() => !isLoading && onClose()}
      title="Approve election?"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading}>
            Approve & publish
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Approving <strong>{election?.title}</strong> will publish it and notify{' '}
        <strong>{election?.creator_name}</strong> at{' '}
        <strong>{election?.creator_email}</strong> by email.
      </p>
    </Modal>
  );
}
