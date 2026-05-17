import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { joinElection } from '../services/voterRegistrationService';

export function useJoinElection({ onSuccess } = {}) {
  const [submitting, setSubmitting] = useState(false);

  const register = useCallback(
    async (electionId) => {
      setSubmitting(true);
      try {
        const result = await joinElection(electionId);

        if (!result?.success) {
          const message = result?.message ?? 'Could not register. Please try again.';
          toast.error(message);
          return { success: false, ...result };
        }

        if (result.auto_locked && result.auto_lock_message) {
          toast.success(result.auto_lock_message);
        } else if (result.code === 'WAITLISTED') {
          toast.success(result.message);
        } else if (result.secret_email_sent) {
          toast.success(
            'You are registered. Your Secret Voting ID was sent to your email — check your inbox (and spam folder).',
          );
        } else if (result.secret_email_error) {
          toast.success(result.message ?? 'You are registered for this election.');
          toast.error(result.secret_email_error);
        } else if (
          result.secret_email_message ||
          (result.secret_ids_issued === 0 && result.code === 'REGISTERED')
        ) {
          toast.success(result.message ?? 'You are registered for this election.');
          toast(
            result.secret_email_message ??
              'No Secret ID email yet — the election needs at least one voting poll. You will receive IDs by email once polls are set up.',
            { icon: 'ℹ️' },
          );
        } else {
          toast.success(result.message ?? 'You are registered for this election.');
        }

        onSuccess?.(result);
        return { success: true, ...result };
      } catch (err) {
        toast.error(err.message ?? 'Could not register. Please try again.');
        return { success: false, message: err.message };
      } finally {
        setSubmitting(false);
      }
    },
    [onSuccess],
  );

  return { register, submitting };
}
