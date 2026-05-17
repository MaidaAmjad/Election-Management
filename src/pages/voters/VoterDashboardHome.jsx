import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import DashboardOverview from '../../components/dashboard/DashboardOverview';
import MyJoinedElectionsList from '../../components/voters/MyJoinedElectionsList';
import { useAuth } from '../../hooks/useAuth';
import { useVoterJoinedElections } from '../../hooks/useVoterJoinedElections';
import { ROUTES } from '../../utils/constants';

export default function VoterDashboardHome() {
  const { user } = useAuth();
  const { elections, loading, error, cancelRegistration, cancellingId } =
    useVoterJoinedElections(user?.id);

  return (
    <div className="space-y-8">
      <DashboardOverview
        title="Voter Dashboard"
        description="View active elections, manage your registrations, and cast your vote securely."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to={ROUTES.PUBLIC_ELECTIONS}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Browse elections
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={ROUTES.VOTER_JOINED_ELECTIONS}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            My joined elections
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={ROUTES.VOTER_SECRET_IDS}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            My secret IDs
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={ROUTES.VOTER_VOTE}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cast vote
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={ROUTES.VOTER_VOTING_HISTORY}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Voting history
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to={ROUTES.VOTER_RESULTS}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Election results
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              My Joined Elections
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Your registrations, waitlist positions, and election status.
            </p>
          </div>
          {elections.length > 5 && (
            <Link
              to={ROUTES.VOTER_JOINED_ELECTIONS}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          )}
        </div>
        <MyJoinedElectionsList
          elections={elections.slice(0, 5)}
          loading={loading}
          error={error}
          onCancel={cancelRegistration}
          cancellingId={cancellingId}
        />
      </section>
    </div>
  );
}
