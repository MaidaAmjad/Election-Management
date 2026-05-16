import { Link } from 'react-router-dom';
import { HiOutlinePlus, HiOutlineUsers } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import CandidateStatsCards from '../../components/candidates/CandidateStatsCards';
import { useAuth } from '../../hooks/useAuth';
import { useCandidateStats } from '../../hooks/useCandidateStats';
import { ROUTES } from '../../utils/constants';

export default function CandidateDashboardPage() {
  const { user } = useAuth();
  const { stats, loading, error } = useCandidateStats(user?.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Candidate management
          </h2>
          <p className="mt-1 text-slate-600">
            Add and manage candidates for your elections.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`${ROUTES.CREATOR_CANDIDATES}/list`}>
            <Button variant="secondary" className="gap-2">
              <HiOutlineUsers className="h-4 w-4" />
              All candidates
            </Button>
          </Link>
          <Link to={`${ROUTES.CREATOR_CANDIDATES}/new`}>
            <Button className="gap-2">
              <HiOutlinePlus className="h-4 w-4" />
              Add candidate
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <CandidateStatsCards stats={stats} loading={loading} />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Quick actions</h3>
        <p className="mt-2 text-sm text-slate-600">
          Register candidates with photos and manifestos, then assign them to one
          of your elections.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`${ROUTES.CREATOR_CANDIDATES}/new`}>
            <Button>Add new candidate</Button>
          </Link>
          <Link to={`${ROUTES.CREATOR_CANDIDATES}/list`}>
            <Button variant="secondary">Browse candidate list</Button>
          </Link>
          <Link to={ROUTES.CREATOR_DASHBOARD}>
            <Button variant="ghost">Back to elections</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
