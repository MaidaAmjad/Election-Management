import { Link } from 'react-router-dom';
import { HiOutlineUser, HiOutlineChartBar } from 'react-icons/hi2';
import PublicStatusBadge from './PublicStatusBadge';
import CountdownTimer from './CountdownTimer';
import { formatElectionDate } from '../../utils/electionFormatters';
import { ROUTES } from '../../utils/constants';

export default function ElectionCard({ election, liveVoteCount }) {
  const votes = liveVoteCount ?? election.vote_count;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="border-b border-slate-100 bg-gradient-to-r from-primary-50 to-slate-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-primary-600">
              {election.category}
            </p>
            <h3 className="mt-1 line-clamp-2 text-lg font-bold text-slate-900">
              {election.title}
            </h3>
          </div>
          <PublicStatusBadge status={election.publicStatus} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 flex-1 text-sm text-slate-600">
          {election.description}
        </p>

        <dl className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <HiOutlineUser className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{election.creator_name}</span>
          </div>
          <div>
            <dt className="sr-only">Start</dt>
            <dd>Starts: {formatElectionDate(election.start_datetime)}</dd>
          </div>
          <div>
            <dt className="sr-only">End</dt>
            <dd>Ends: {formatElectionDate(election.end_datetime)}</dd>
          </div>
          <div>
            <dt className="sr-only">Registration</dt>
            <dd>
              Registration: {formatElectionDate(election.registration_deadline)}
            </dd>
          </div>
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <HiOutlineChartBar className="h-4 w-4 text-primary-600" />
            <span>
              {votes.toLocaleString()} / {election.max_voters.toLocaleString()}{' '}
              votes
            </span>
          </div>
        </dl>

        <div className="mt-4">
          <CountdownTimer election={election} variant="inline" />
        </div>

        <Link
          to={`${ROUTES.PUBLIC_ELECTIONS}/${election.id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          View details
        </Link>
      </div>
    </article>
  );
}


