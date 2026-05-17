import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const ACTION_LABELS = {
  unlock: 'Unlock registration',
  lock: 'Lock registration',
  maxVoters: 'Update maximum voters',
  addVoter: 'Add voter manually',
  removeVoter: 'Remove voter manually',
};

export default function AdminOverrideModal({
  open,
  onClose,
  action,
  onSubmit,
  submitting = false,
  extraFields = null,
}) {
  const [reason, setReason] = useState('');

  function handleClose() {
    setReason('');
    onClose();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await onSubmit({ reason: reason.trim() });
    if (ok) {
      setReason('');
    }
  }

  if (!action) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Admin Override Action"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="admin-override-form"
            disabled={!reason.trim() || submitting}
            isLoading={submitting}
          >
            Confirm override
          </Button>
        </>
      }
    >
      <form id="admin-override-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm font-medium text-slate-900">
          {ACTION_LABELS[action]}
        </p>
        <p className="text-sm text-slate-600">
          This action will be logged. Provide a reason for the override.
        </p>

        {extraFields}

        <div>
          <label
            htmlFor="override-reason"
            className="block text-sm font-medium text-slate-700"
          >
            Override reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="override-reason"
            rows={3}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Describe why this override is necessary…"
          />
        </div>
      </form>
    </Modal>
  );
}
