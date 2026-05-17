import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import DashboardStatCard from '../../../components/dashboard/DashboardStatCard';
import StatCardSkeleton from '../../../components/dashboard/StatCardSkeleton';
import QuickActionGrid from '../../../components/dashboard/QuickActionGrid';
import VoterPollsTable from '../../../components/dashboard/VoterPollsTable';
import ResultsSummaryCards from '../../../components/dashboard/ResultsSummaryCards';
import Input from '../../../components/ui/Input';
import { useVoterDashboard } from '../../../hooks/useVoterDashboard';
import { ROUTES } from '../../../utils/constants';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'Not Started', label: 'Not started' },
  { value: 'Active', label: 'Active' },
  { value: 'Voted', label: 'Voted' },
  { value: 'Completed', label: 'Completed' },
];

export default function VoterDashboardPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { stats, polls, results, loading, error } = useVoterDashboard({
    search,
    statusFilter,
  });

  const cards = stats?.cards ?? {};

  const quickActions = [
    { label: 'Browse elections', to: ROUTES.PUBLIC_ELECTIONS, icon: HiOutlineArrowRight },
    { label: 'Joined polls', to: ROUTES.VOTER_JOINED_ELECTIONS, icon: HiOutlineDocumentText },
    { label: 'Voting history', to: ROUTES.VOTER_VOTING_HISTORY, icon: HiOutlineClock },
    { label: 'View results', to: ROUTES.VOTER_RESULTS, icon: HiOutlineChartBar },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Voter Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Your polls, voting status, and election results — updated in real time.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <StatCardSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard label="Joined polls" value={cards.joined_polls} icon={HiOutlineDocumentText} />
          <DashboardStatCard label="Active polls" value={cards.active_polls} icon={HiOutlineCalendar} accent="emerald" />
          <DashboardStatCard label="Completed polls" value={cards.completed_polls} icon={HiOutlineCheckCircle} accent="violet" />
          <DashboardStatCard label="Pending polls" value={cards.pending_polls} icon={HiOutlineClock} accent="amber" />
        </div>
      )}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Quick actions</h3>
        <QuickActionGrid actions={quickActions} />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">My joined polls</h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search polls or elections…"
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="animate-pulse rounded-xl bg-slate-100 h-48" />
        ) : (
          <VoterPollsTable polls={polls} />
        )}
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Results</h3>
        <ResultsSummaryCards
          items={results.map((r) => ({
            ...r,
            title: r.title,
            winner_name: r.winner_name,
            turnout_percentage: r.turnout_percentage,
            result_status: r.participated ? 'Participated' : r.result_status,
          }))}
          resultsBasePath={ROUTES.VOTER_RESULTS}
          emptyMessage="Completed elections you joined will show results here."
        />
      </section>

      <p className="text-center text-sm text-slate-500">
        <Link to={ROUTES.PUBLIC_ELECTIONS} className="font-medium text-primary-600 hover:underline">
          Join another election
        </Link>
      </p>
    </div>
  );
}
