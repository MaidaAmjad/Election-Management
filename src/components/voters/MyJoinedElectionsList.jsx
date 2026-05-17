import { Link } from 'react-router-dom';
import {
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCalendar,
  HiOutlineXMark,
} from 'react-icons/hi2';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import VoterRegistrationStatusBadge from './VoterRegistrationStatusBadge';
import { formatElectionDate } from '../../utils/electionFormatters';
import { getPublicElectionStatus } from '../../utils/publicElectionStatus';
import { ROUTES } from '../../utils/constants';
import { VOTER_REGISTRATION_STATUS } from '../../utils/voterRegistrationConstants';
import PublicStatusBadge from '../public/PublicStatusBadge';

export default function MyJoinedElectionsList({
  elections,
  loading,
  error,
  onCancel,
  cancellingId,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!elections.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <p className="font-medium text-slate-900">No joined elections yet</p>
        <p className="mt-2 text-sm text-slate-600">
          Browse published elections and join one to see it here.
        </p>
        <Link
          to={ROUTES.PUBLIC_ELECTIONS}
          className="mt-4 inline-flex text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Browse elections
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {elections.map((entry) => (
        <JoinedElectionCard
          key={entry.id}
          entry={entry}
          onCancel={onCancel}
          isCancelling={cancellingId === entry.election_id}
        />
      ))}
    </ul>
  );
}

function JoinedElectionCard({ entry, onCancel, isCancelling }) {
  const election = entry.election;
  const publicStatus = election
    ? getPublicElectionStatus(election)
    : null;
  const canCancel = ['Registered', 'Waitlisted', 'Approved'].includes(
    entry.status,
  );

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {election?.title ?? 'Election'}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <VoterRegistrationStatusBadge status={entry.status} />
            {publicStatus && <PublicStatusBadge status={publicStatus} />}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`${ROUTES.PUBLIC_ELECTIONS}/${entry.election_id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
            View Election
          </Link>
          {canCancel && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCancel(entry.election_id)}
              isLoading={isCancelling}
              className="gap-1.5"
            >
              <HiOutlineXMark className="h-4 w-4" />
              Cancel Registration
            </Button>
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2 text-slate-600">
          <HiOutlineCalendar className="h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Registration date
            </dt>
            <dd className="font-medium text-slate-900">
              {formatElectionDate(entry.registered_at)}
            </dd>
          </div>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-slate-500">
            Registration status
          </dt>
          <dd className="mt-0.5 font-medium text-slate-900">{entry.status}</dd>
        </div>
        {entry.status === VOTER_REGISTRATION_STATUS.WAITLISTED &&
          entry.waitlist_position != null && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase text-slate-500">
                Waitlist
              </dt>
              <dd className="mt-0.5 font-semibold text-amber-800">
                Your Waitlist Position: {entry.waitlist_position}
              </dd>
            </div>
          )}
        {publicStatus && (
          <div>
            <dt className="text-xs font-medium uppercase text-slate-500">
              Current status
            </dt>
            <dd className="mt-0.5 font-medium text-slate-900">{publicStatus}</dd>
          </div>
        )}
      </dl>
    </li>
  );
}
