import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  castAnonymousVote,
  validateSecretIdForVoting,
} from '../services/votingService';

export function useVoteCast({ pollId, onSuccess }) {
  const [secretId, setSecretId] = useState('');
  const [secretValidated, setSecretValidated] = useState(false);
  const [validatingSecret, setValidatingSecret] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const submitLock = useRef(false);

  const resetSecret = useCallback(() => {
    setSecretValidated(false);
    setSelectedCandidateId(null);
    setShowConfirm(false);
  }, []);

  const validateSecret = useCallback(async () => {
    if (!pollId || !secretId.trim()) {
      toast.error('Enter your Secret ID.');
      return false;
    }

    setValidatingSecret(true);
    try {
      const result = await validateSecretIdForVoting(secretId, pollId);
      if (!result?.valid) {
        toast.error(result?.message ?? 'Invalid Secret ID');
        setSecretValidated(false);
        return false;
      }
      setSecretValidated(true);
      return true;
    } catch (err) {
      toast.error(err.message ?? 'Invalid Secret ID');
      setSecretValidated(false);
      return false;
    } finally {
      setValidatingSecret(false);
    }
  }, [pollId, secretId]);

  const openConfirmation = useCallback(() => {
    if (!secretValidated) {
      toast.error('Validate your Secret ID first.');
      return;
    }
    if (!selectedCandidateId) {
      toast.error('Select a candidate to continue.');
      return;
    }
    setShowConfirm(true);
  }, [secretValidated, selectedCandidateId]);

  const submitVote = useCallback(async () => {
    if (!pollId || !selectedCandidateId || submitLock.current) return;

    submitLock.current = true;
    setSubmitting(true);

    try {
      const result = await castAnonymousVote(
        secretId,
        pollId,
        selectedCandidateId,
      );

      if (!result?.success) {
        toast.error(result?.message ?? 'Vote could not be submitted.');
        return { success: false };
      }

      toast.success(result.message ?? 'Your vote has been submitted successfully.');
      setShowConfirm(false);
      onSuccess?.();
      return { success: true };
    } catch (err) {
      toast.error(err.message ?? 'Vote could not be submitted.');
      return { success: false };
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  }, [pollId, secretId, selectedCandidateId, onSuccess]);

  return {
    secretId,
    setSecretId,
    secretValidated,
    validatingSecret,
    validateSecret,
    resetSecret,
    selectedCandidateId,
    setSelectedCandidateId,
    showConfirm,
    setShowConfirm,
    openConfirmation,
    submitting,
    submitVote,
  };
}
