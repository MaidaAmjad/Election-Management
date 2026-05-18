import { Link } from 'react-router-dom';
import { HiOutlineSignal } from 'react-icons/hi2';
import CandidateProgressBars from '../results/CandidateProgressBars';
import ElectionCardSkeleton from './ElectionCardSkeleton';
import EmptyState from './EmptyState';
import PublicStatusBadge from './PublicStatusBadge';
import { ROUTES } from '../../utils/constants';
import { PUBLIC_ELECTION_STATUS } from '../../utils/publicElectionConstants';

export default function PublicLiveResultsPanel({
  active = [],
  completed = [],
  loading = false,
  error = null,
  filter = 'all',
}) {
  const list =
    filter === 'active'
      ? active
      : filter === 'completed'
        ? completed
        : [...active, ...completed];

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ElectionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!list.length) {
    return (
      <EmptyState
        title="No results to show yet"
        description="Live progress bars appear when an election is active or completed and has voting polls."
      />
    );
  }

  return (
    <div className="space-y-8">
      {list.map((election) => (
        <ElectionLiveResultsCard key={election.id} election={election} />
      ))}
    </div>
  );
}

function ElectionLiveResultsCard({ election }) {
  const polls = election.results?.polls ?? [];
  const isLive = election.publicStatus === PUBLIC_ELECTION_STATUS.ACTIVE;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-primary-50 to-slate-50 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
            {election.category}
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">{election.title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PublicStatusBadge status={election.publicStatus} />
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
              <HiOutlineSignal className="h-3.5 w-3.5" aria-hidden="true" />
              Live
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {!polls.length ? (
          <p className="text-sm text-slate-500">
            No voting polls configured for this election yet.
          </p>
        ) : (
          polls.map((poll) => (
            <section
              key={poll.id}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-slate-900">{poll.title}</h4>
                <span className="text-sm text-slate-600">
                  {poll.totalVotes.toLocaleString()} vote
                  {poll.totalVotes === 1 ? '' : 's'}
                </span>
              </div>
              {poll.candidates.length ? (
                <CandidateProgressBars candidates={poll.candidates} />
              ) : (
                <p className="text-sm text-slate-500">No candidates on this poll yet.</p>
              )}
            </section>
          ))
        )}

        <Link
          to={`${ROUTES.PUBLIC_ELECTIONS}/${election.id}`}
          className="inline-flex text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          View election details →
        </Link>
      </div>
    </article>
  );
}
