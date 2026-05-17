import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { subscribeToElectionRegistrationStatus } from '../services/voterFinalizationService';
import { AUTO_LOCK_MESSAGE, REGISTRATION_STATUS } from '../utils/finalizationConstants';

/**
 * Shows toast when registration_status changes to Locked (e.g. auto-lock at capacity).
 */
export function useRegistrationLockMonitor(electionId, { enabled = true } = {}) {
  const previousStatus = useRef(null);

  useEffect(() => {
    if (!electionId || !enabled) return undefined;

    const unsubscribe = subscribeToElectionRegistrationStatus(
      electionId,
      (updated) => {
        const next = updated?.registration_status;
        const prev = previousStatus.current;

        if (
          prev === REGISTRATION_STATUS.OPEN &&
          next === REGISTRATION_STATUS.LOCKED
        ) {
          toast.success(AUTO_LOCK_MESSAGE);
        }

        previousStatus.current = next;
      },
    );

    return unsubscribe;
  }, [electionId, enabled]);

  useEffect(() => {
    previousStatus.current = null;
  }, [electionId]);
}
