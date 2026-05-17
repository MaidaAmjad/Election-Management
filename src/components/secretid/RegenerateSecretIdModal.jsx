import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { REGENERATE_WARNING } from '../../utils/secretIdConstants';

export default function RegenerateSecretIdModal({
  open,
  onClose,
  onConfirm,
  submitting = false,
  voterName,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Regenerate Secret ID"
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={submitting}>
            Regenerate
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        {REGENERATE_WARNING}
      </p>
      {voterName && (
        <p className="mt-3 text-sm font-medium text-slate-900">
          Voter: {voterName}
        </p>
      )}
      <p className="mt-2 text-sm text-slate-500">
        A new ID will be emailed automatically after regeneration.
      </p>
    </Modal>
  );
}
