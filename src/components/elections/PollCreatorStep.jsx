import { HiOutlinePlus, HiOutlineXMark } from 'react-icons/hi2';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Toggle from '../ui/Toggle';
import { emptyPoll } from '../../utils/electionValidation';

function CandidateChip({ candidate, selected, onToggle, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={[
        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
        selected
          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      {candidate.photo_url ? (
        <img
          src={candidate.photo_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-semibold text-slate-600">
          {candidate.name?.charAt(0) ?? '?'}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          {candidate.name}
        </span>
        {candidate.designation && (
          <span className="block truncate text-xs text-slate-500">
            {candidate.designation}
          </span>
        )}
      </span>
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
          selected
            ? 'border-primary-600 bg-primary-600 text-white'
            : 'border-slate-300 bg-white text-transparent',
        ].join(' ')}
        aria-hidden="true"
      >
        ✓
      </span>
    </button>
  );
}

function PollCard({
  poll,
  index,
  poolCandidates,
  errors,
  readOnly,
  canRemove,
  onUpdate,
  onRemove,
}) {
  const selectedIds = poll.optionCandidateIds ?? [];
  const selectedSet = new Set(selectedIds);

  function toggleCandidate(candidateId) {
    const next = selectedSet.has(candidateId)
      ? selectedIds.filter((id) => id !== candidateId)
      : [...selectedIds, candidateId];
    onUpdate({ optionCandidateIds: next });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h4 className="text-sm font-semibold text-slate-800">Poll {index + 1}</h4>
        {!readOnly && canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            title="Remove poll"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        )}
      </header>

      <div className="space-y-5 p-4">
        <Input
          id={`poll-question-${poll.id}`}
          label="Question"
          value={poll.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          error={errors?.title}
          disabled={readOnly}
          placeholder="Ask a question"
        />

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Options</p>
          <p className="mb-3 text-xs text-slate-500">
            Select candidates from your list. Pick at least two per poll.
          </p>
          {errors?.options && (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {errors.options}
            </p>
          )}
          {poolCandidates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-4 text-sm text-amber-900">
              Add candidates in the previous step first.
            </p>
          ) : (
            <ul className="space-y-2">
              {poolCandidates.map((candidate) => (
                <li key={candidate.id}>
                  <CandidateChip
                    candidate={candidate}
                    selected={selectedSet.has(candidate.id)}
                    onToggle={() => toggleCandidate(candidate.id)}
                    disabled={readOnly}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <Toggle
          id={`poll-multi-${poll.id}`}
          label="Allow multiple answers"
          description="Voters may choose more than one option (when supported)."
          enabled={Boolean(poll.allowMultipleAnswers)}
          onChange={(value) => onUpdate({ allowMultipleAnswers: value })}
          disabled={readOnly}
        />
      </div>
    </article>
  );
}

export default function PollCreatorStep({
  polls,
  poolCandidates,
  onChange,
  errors = {},
  readOnly = false,
}) {
  const displayPolls = polls.filter((p) => !p.isStaging);

  function updatePoll(index, patch) {
    const real = [...displayPolls];
    real[index] = { ...real[index], ...patch };
    const staging = polls.filter((p) => p.isStaging);
    onChange([...staging, ...real]);
  }

  function addPoll() {
    onChange([...polls.filter((p) => p.isStaging), ...displayPolls, emptyPoll()]);
  }

  function removePoll(index) {
    if (displayPolls.length <= 1) return;
    const real = displayPolls.filter((_, i) => i !== index);
    onChange([...polls.filter((p) => p.isStaging), ...real]);
  }

  const pollErrors = errors.polls ?? {};

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Create polls</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add one or more polls. Each poll is a question with options chosen from your
          candidates — like a group poll.
        </p>
        {errors.pollsGeneral && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {errors.pollsGeneral}
          </p>
        )}
      </section>

      <div className="space-y-4">
        {displayPolls.map((poll, index) => (
          <PollCard
            key={poll.id}
            poll={poll}
            index={index}
            poolCandidates={poolCandidates}
            errors={pollErrors[index]}
            readOnly={readOnly}
            canRemove={displayPolls.length > 1}
            onUpdate={(patch) => updatePoll(index, patch)}
            onRemove={() => removePoll(index)}
          />
        ))}
      </div>

      {!readOnly && (
        <Button type="button" variant="secondary" className="gap-2" onClick={addPoll}>
          <HiOutlinePlus className="h-4 w-4" aria-hidden="true" />
          Add another poll
        </Button>
      )}

      {poolCandidates.length > 0 && (
        <p className="text-center text-xs text-slate-500">
          {poolCandidates.length} candidate{poolCandidates.length === 1 ? '' : 's'} available
          to assign across polls
        </p>
      )}
    </div>
  );
}
