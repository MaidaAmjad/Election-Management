import ElectionDetailsStep from './ElectionDetailsStep';
import { PollsOnlyStep } from './PollCandidatesStep';
import PollCandidateEditor from './PollCandidateEditor';

export default function ElectionReadOnlyView({ form }) {
  return (
    <div className="space-y-6">
      <ElectionDetailsStep form={form} onChange={() => {}} readOnly />
      <PollsOnlyStep polls={form.polls} onChange={() => {}} readOnly />

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Candidates by poll</h3>
        {form.polls.map((poll, index) => (
          <article
            key={poll.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h4 className="font-semibold text-slate-900">
              {poll.title || `Poll ${index + 1}`}
            </h4>
            <div className="mt-4">
              <PollCandidateEditor
                poll={poll}
                electionId={form.electionId}
                creatorId=""
                candidates={poll.candidates ?? []}
                onCandidatesChange={() => {}}
                readOnly
              />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
