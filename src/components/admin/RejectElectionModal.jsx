import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { validateRejectionReason } from '../../utils/creatorRequestValidation';

export default function RejectElectionModal({
  open,
  election,
  onClose,
  onConfirm,
  isLoading,
}) {
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) {
      setReason('');
      setErrors({});
    }
  }, [open]);

  function handleConfirm() {
    const nextErrors = validateRejectionReason(reason);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onConfirm(reason);
  }

  return (
    <Modal
      open={open}
      onClose={() => !isLoading && onClose()}
      title="Reject election request?"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isLoading}>
            Reject
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Rejecting <strong>{election?.title}</strong> will notify{' '}
          <strong>{election?.creator_name}</strong> at{' '}
          <strong>{election?.creator_email}</strong> with your reason.
        </p>
        <Textarea
          id="election-rejection-reason"
          label="Rejection reason"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (errors.rejectionReason) setErrors({});
          }}
          error={errors.rejectionReason}
          rows={4}
          placeholder="Explain why this election was not approved..."
          disabled={isLoading}
        />
      </div>
    </Modal>
  );
}
