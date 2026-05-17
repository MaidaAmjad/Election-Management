import PollCandidateEditor from './PollCandidateEditor';
import PollCreatorStep from './PollCreatorStep';

export default function PollCandidatesStep({
  electionTitle,
  polls,
  electionId,
  creatorId,
  onPollCandidatesChange,
  candidateErrors = {},
  readOnly = false,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Add candidates per poll</h3>
        <p className="mt-1 text-sm text-slate-500">
          Each candidate belongs to exactly one poll in{' '}
          <strong>{electionTitle || 'your election'}</strong>. Voters choose one candidate
          per poll when voting.
        </p>
      </section>

      {polls.map((poll, index) => (
        <article
          key={poll.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <header className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <h4 className="font-semibold text-slate-900">{poll.title || `Poll ${index + 1}`}</h4>
            {poll.description && (
              <p className="mt-1 text-sm text-slate-600">{poll.description}</p>
            )}
            {candidateErrors[index] && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {candidateErrors[index]}
              </p>
            )}
          </header>
          <div className="p-5">
            <PollCandidateEditor
              poll={poll}
              electionId={electionId}
              creatorId={creatorId}
              candidates={poll.candidates ?? []}
              onCandidatesChange={(next) => onPollCandidatesChange(poll.id, next)}
              readOnly={readOnly}
            />
          </div>
        </article>
      ))}
    </div>
  );
}

export function PollsOnlyStep({ polls, poolCandidates, onChange, errors, readOnly }) {
  return (
    <PollCreatorStep
      polls={polls}
      poolCandidates={poolCandidates}
      onChange={onChange}
      errors={errors}
      readOnly={readOnly}
    />
  );
}
