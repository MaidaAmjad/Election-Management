import { HiOutlineSignal } from 'react-icons/hi2';
import CandidateProgressBars from '../results/CandidateProgressBars';
import Spinner from '../ui/Spinner';
import { PUBLIC_ELECTION_STATUS } from '../../utils/publicElectionConstants';

export default function PublicElectionResultsSection({
  polls,
  loading,
  error,
  publicStatus,
  enabled,
}) {
  if (!enabled) return null;

  const isLive = publicStatus === PUBLIC_ELECTION_STATUS.ACTIVE;

  return (
    <section className="border-t border-slate-200 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Results by poll</h2>
          <p className="mt-1 text-sm text-slate-600">
            Masked voter IDs show which secret ID voted for each candidate.
          </p>
        </div>
        {isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
            <HiOutlineSignal className="h-3.5 w-3.5" aria-hidden="true" />
            Live
          </span>
        )}
      </div>

      {error && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && !polls.length ? (
        <div className="mt-6 flex justify-center py-8">
          <Spinner />
        </div>
      ) : null}

      {!loading && !error && !polls.length ? (
        <p className="mt-4 text-sm text-slate-500">
          No voting polls configured for this election yet.
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        {polls.map((poll) => (
          <article
            key={poll.id}
            className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-slate-900">{poll.title}</h3>
              <span className="text-sm text-slate-600">
                {poll.totalVotes.toLocaleString()} vote
                {poll.totalVotes === 1 ? '' : 's'}
              </span>
            </div>
            {poll.candidates.length ? (
              <CandidateProgressBars
                candidates={poll.candidates}
                showMaskedVoterIds
              />
            ) : (
              <p className="text-sm text-slate-500">No candidates on this poll yet.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
