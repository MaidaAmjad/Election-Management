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

        if (result.code === 'WAITLISTED') {
          toast.success(result.message);
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
