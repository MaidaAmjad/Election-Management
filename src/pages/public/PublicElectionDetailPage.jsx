import { Link, useParams } from 'react-router-dom';
import {
  HiOutlineArrowLeft,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineUser,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import CountdownTimer from '../../components/public/CountdownTimer';
import ParticipateButton from '../../components/public/ParticipateButton';
import PublicStatusBadge from '../../components/public/PublicStatusBadge';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { usePublicElectionDetail } from '../../hooks/usePublicElectionDetail';
import { formatElectionDate } from '../../utils/electionFormatters';
import { ROUTES } from '../../utils/constants';
import { PUBLIC_ELECTION_STATUS } from '../../utils/publicElectionConstants';

export default function PublicElectionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    election,
    voteCount,
    isRegistered,
    setIsRegistered,
    loading,
    error,
    refresh,
  } = usePublicElectionDetail(id, user?.id);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Election not found</h1>
        <p className="mt-2 text-slate-600">{error ?? 'This election may be unavailable.'}</p>
        <Link
          to={ROUTES.PUBLIC_ELECTIONS}
          className="mt-6 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to elections
        </Link>
      </div>
    );
  }

  const showLiveVotes =
    election.publicStatus === PUBLIC_ELECTION_STATUS.ACTIVE;

  return (
    <div className="bg-slate-50 py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          to={ROUTES.PUBLIC_ELECTIONS}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          All elections
        </Link>

        <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-6 py-10 text-white sm:px-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-primary-200">
                  {election.category}
                </p>
                <h1 className="mt-2 text-3xl font-bold">{election.title}</h1>
              </div>
              <PublicStatusBadge status={election.publicStatus} />
            </div>
            <div className="mt-8">
              <CountdownTimer election={election} variant="card" />
            </div>
          </div>

          <div className="space-y-8 p-6 sm:p-8">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">About</h2>
              <p className="mt-3 whitespace-pre-wrap text-slate-600">
                {election.description}
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <DetailItem
                icon={HiOutlineUser}
                label="Creator"
                value={election.creator_name}
              />
              <DetailItem
                icon={HiOutlineUserGroup}
                label="Candidates"
                value={String(election.candidate_count ?? 0)}
              />
              <DetailItem
                icon={HiOutlineChartBar}
                label={showLiveVotes ? 'Current votes (live)' : 'Total votes'}
                value={`${voteCount.toLocaleString()} / ${election.max_voters.toLocaleString()}`}
              />
              <DetailItem
                icon={HiOutlineUserGroup}
                label="Registered voters"
                value={`${election.registered_voters_count.toLocaleString()} / ${election.max_voters.toLocaleString()}`}
              />
              <DetailItem
                icon={HiOutlineCalendar}
                label="Starts"
                value={formatElectionDate(election.start_datetime)}
              />
              <DetailItem
                icon={HiOutlineCalendar}
                label="Ends"
                value={formatElectionDate(election.end_datetime)}
              />
              <DetailItem
                icon={HiOutlineCalendar}
                label="Registration deadline"
                value={formatElectionDate(election.registration_deadline)}
                className="sm:col-span-2"
              />
            </section>

            <div className="border-t border-slate-200 pt-6">
              <ParticipateButton
                election={election}
                isRegistered={isRegistered}
                onRegistered={() => {
                  setIsRegistered(true);
                  refresh();
                }}
              />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, className = '' }) {
  return (
    <div
      className={`flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 ${className}`}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="mt-1 font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}
