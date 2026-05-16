import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function ApproveRequestModal({
  open,
  request,
  onClose,
  onConfirm,
  isLoading,
}) {
  return (
    <Modal
      open={open}
      onClose={() => !isLoading && onClose()}
      title="Approve creator request?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} isLoading={isLoading}>
            Approve
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        Approving <strong>{request?.creator_name}</strong> will grant Election
        Creator dashboard access. A confirmation email will be sent to{' '}
        <strong>{request?.email}</strong>.
      </p>
    </Modal>
  );
}
