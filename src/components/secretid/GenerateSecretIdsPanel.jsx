import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useSecretIdGeneration } from '../../hooks/useSecretIdGeneration';
import { REGISTRATION_STATUS } from '../../utils/finalizationConstants';

export default function GenerateSecretIdsPanel({
  election,
  hasSecretIds,
  onComplete,
}) {
  const { generateAndEmail, busy, progressLabel } = useSecretIdGeneration({
    electionId: election?.id,
    onComplete,
  });

  if (!election) return null;

  const isFinalized =
    election.registration_status === REGISTRATION_STATUS.FINALIZED;

  if (!isFinalized) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Finalize the voter list before generating secret IDs.
      </p>
    );
  }

  if (hasSecretIds) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Secret IDs have already been generated for this election. Use the
        management dashboard to resend emails or regenerate IDs (Super Admin).
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-5">
      <h3 className="text-lg font-semibold text-slate-900">Secret voting IDs</h3>
      <p className="mt-1 text-sm text-slate-600">
        Generate unique IDs per voter per poll, then email them automatically via
        Resend.
      </p>

      {busy && (
        <div className="mt-4 flex items-center gap-3 text-sm font-medium text-primary-800">
          <Spinner size="sm" />
          {progressLabel}
        </div>
      )}

      <Button
        className="mt-4"
        onClick={generateAndEmail}
        disabled={busy}
        isLoading={busy}
      >
        Generate Secret IDs
      </Button>
    </div>
  );
}
