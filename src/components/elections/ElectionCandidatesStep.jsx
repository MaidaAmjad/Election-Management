import PollCandidateEditor from './PollCandidateEditor';

/**
 * Step 2 — candidates are added to the staging poll (first poll in the database).
 */
export default function ElectionCandidatesStep({
  electionTitle,
  stagingPoll,
  electionId,
  creatorId,
  candidates,
  onCandidatesChange,
  candidateErrors = {},
  readOnly = false,
}) {
  if (!stagingPoll?.id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Save election details first, then continue to add candidates.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Add candidates</h3>
        <p className="mt-1 text-sm text-slate-500">
          Register candidates for{' '}
          <strong>{electionTitle || 'your election'}</strong>. In the next step you
          will create polls and assign how voting is organized.
        </p>
        {candidateErrors.candidatesGeneral && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {candidateErrors.candidatesGeneral}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PollCandidateEditor
          poll={stagingPoll}
          electionId={electionId}
          creatorId={creatorId}
          candidates={candidates}
          onCandidatesChange={onCandidatesChange}
          readOnly={readOnly}
        />
      </section>
    </div>
  );
}
