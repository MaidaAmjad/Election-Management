import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { PARTICIPATION_TERMS } from '../../utils/voterRegistrationConstants';

export default function ElectionParticipationModal({
  open,
  onClose,
  onConfirm,
  submitting = false,
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  function handleClose() {
    setTermsAccepted(false);
    onClose();
  }

  async function handleConfirm() {
    if (!termsAccepted) return;
    await onConfirm();
    setTermsAccepted(false);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Election Participation Confirmation"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!termsAccepted || submitting}
            isLoading={submitting}
          >
            I Want to Participate
          </Button>
        </>
      }
    >
      <p className="text-slate-600">
        Do you want to participate in this election?
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">
          Terms and conditions
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
          {PARTICIPATION_TERMS.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
        />
        <span className="text-sm text-slate-700">
          I agree to the terms and conditions
        </span>
      </label>
    </Modal>
  );
}
