import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import {
  generateSecretIdsForElection,
  sendAllSecretIdEmails,
} from '../services/secretIdService';

export function useSecretIdGeneration({ electionId, onComplete }) {
  const [generating, setGenerating] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');

  const generateAndEmail = useCallback(async () => {
    if (!electionId) return;

    setGenerating(true);
    setProgressLabel('Generating IDs...');

    try {
      const result = await generateSecretIdsForElection(electionId);

      if (!result?.success) {
        toast.error(result?.message ?? 'Could not generate secret IDs.');
        return { success: false };
      }

      toast.success(result.message ?? 'Secret IDs generated successfully');

      setGenerating(false);
      setSendingEmails(true);
      setProgressLabel('Sending emails to voters...');

      const emailResult = await sendAllSecretIdEmails(electionId);

      toast.success(
        `Emails sent: ${emailResult.sent ?? 0}, failed: ${emailResult.failed ?? 0}`,
      );

      onComplete?.();
      return { success: true, ...result, emailResult };
    } catch (err) {
      toast.error(err.message ?? 'Secret ID generation failed.');
      return { success: false };
    } finally {
      setGenerating(false);
      setSendingEmails(false);
      setProgressLabel('');
    }
  }, [electionId, onComplete]);

  const busy = generating || sendingEmails;

  return {
    generateAndEmail,
    generating,
    sendingEmails,
    busy,
    progressLabel,
  };
}
