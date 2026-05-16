import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { emptyPoll } from '../../utils/electionValidation';

export default function PollsManager({
  polls,
  onChange,
  errors = {},
  readOnly = false,
}) {
  function updatePoll(index, field, value) {
    const next = polls.map((poll, i) =>
      i === index ? { ...poll, [field]: value } : poll,
    );
    onChange(next);
  }

  function addPoll() {
    onChange([...polls, emptyPoll()]);
  }

  function removePoll(index) {
    if (polls.length <= 1) return;
    onChange(polls.filter((_, i) => i !== index));
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Polls</h3>
          <p className="text-sm text-slate-500">
            Add multiple polls inside this election.
          </p>
        </div>
        {!readOnly && (
          <Button type="button" variant="secondary" size="sm" onClick={addPoll}>
            <HiOutlinePlus className="h-4 w-4" aria-hidden="true" />
            Add poll
          </Button>
        )}
      </div>

      {errors.pollsGeneral && (
        <p className="text-sm text-red-600" role="alert">
          {errors.pollsGeneral}
        </p>
      )}

      <div className="space-y-4">
        {polls.map((poll, index) => (
          <article
            key={poll.id}
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">
                Poll {index + 1}
              </h4>
              {!readOnly && polls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePoll(index)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  <HiOutlineTrash className="h-4 w-4" aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-4">
              <Input
                id={`poll-title-${poll.id}`}
                label="Poll title"
                value={poll.title}
                onChange={(e) => updatePoll(index, 'title', e.target.value)}
                error={errors.polls?.[index]?.title}
                disabled={readOnly}
                placeholder="e.g. Presidential election"
              />
              <Textarea
                id={`poll-desc-${poll.id}`}
                label="Poll description"
                value={poll.description}
                onChange={(e) =>
                  updatePoll(index, 'description', e.target.value)
                }
                error={errors.polls?.[index]?.description}
                disabled={readOnly}
                rows={3}
                placeholder="Describe what voters are deciding"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
