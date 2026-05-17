import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowDownTray,
  HiOutlineCalendar,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineHandRaised,
} from 'react-icons/hi2';
import DashboardStatCard from '../../../components/dashboard/DashboardStatCard';
import StatCardSkeleton from '../../../components/dashboard/StatCardSkeleton';
import QuickActionGrid from '../../../components/dashboard/QuickActionGrid';
import RecentActivityList from '../../../components/dashboard/RecentActivityList';
import ChartPanel from '../../../components/dashboard/ChartPanel';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useAdminDashboard } from '../../../hooks/useAdminDashboard';
import { ROUTES } from '../../../utils/constants';
import { exportAdminDashboardReport } from '../../../utils/exportDashboardReport';
import ElectionsOverTimeChart from '../../../charts/ElectionsOverTimeChart';
import UserRolePieChart from '../../../charts/UserRolePieChart';
import VotingParticipationChart from '../../../charts/VotingParticipationChart';
import ElectionStatusPieChart from '../../../charts/ElectionStatusPieChart';
import DailyActivityChart from '../../../charts/DailyActivityChart';

export default function AdminDashboardPage() {
  const [days, setDays] = useState(30);
  const [activitySearch, setActivitySearch] = useState('');
  const { stats, activity, loading, error, refresh } = useAdminDashboard({ days });

  const cards = stats?.cards ?? {};
  const charts = stats?.charts ?? {};

  const filteredActivity = activity.filter(
    (a) =>
      !activitySearch.trim() ||
      `${a.action_type} ${a.description} ${a.user_name} ${a.election_title}`
        .toLowerCase()
        .includes(activitySearch.toLowerCase()),
  );

  function handleExport() {
    try {
      exportAdminDashboardReport({
        cards,
        charts,
        activity: filteredActivity,
        generatedAt: new Date().toISOString(),
      });
      toast.success('Analytics report downloaded.');
    } catch (err) {
      toast.error(err.message ?? 'Export failed.');
    }
  }

  const quickActions = [
    { label: 'Election requests', to: ROUTES.ADMIN_ELECTION_REQUESTS, icon: HiOutlineClipboardDocumentList },
    { label: 'Creator requests', to: ROUTES.ADMIN_REQUESTS, icon: HiOutlineUsers },
    { label: 'View audit logs', to: ROUTES.ADMIN_AUDIT, icon: HiOutlineShieldCheck },
    { label: 'Manage elections', to: ROUTES.ADMIN_APPROVED_ELECTIONS, icon: HiOutlineDocumentText },
    { label: 'Finalized voters', to: ROUTES.ADMIN_FINALIZED_VOTERS, icon: HiOutlineUsers },
    { label: 'System settings', to: ROUTES.SETTINGS, icon: HiOutlineCog6Tooth },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            Platform analytics, elections, users, and activity — updates in real time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={handleExport} disabled={loading}>
            <HiOutlineArrowDownTray className="h-4 w-4" />
            Export report
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <StatCardSkeleton count={8} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard label="Total elections" value={cards.total_elections} icon={HiOutlineDocumentText} />
          <DashboardStatCard label="Active elections" value={cards.active_elections} icon={HiOutlineChartBar} accent="emerald" />
          <DashboardStatCard label="Upcoming elections" value={cards.upcoming_elections} icon={HiOutlineCalendar} accent="amber" />
          <DashboardStatCard label="Completed elections" value={cards.completed_elections} icon={HiOutlineCheckCircle} accent="violet" />
          <DashboardStatCard label="Total users" value={cards.total_users} icon={HiOutlineUsers} />
          <DashboardStatCard label="Election creators" value={cards.total_creators} icon={HiOutlineUserGroup} accent="blue" />
          <DashboardStatCard label="Voters" value={cards.total_voters} icon={HiOutlineUserGroup} accent="slate" />
          <DashboardStatCard label="Total votes cast" value={cards.total_votes_cast} icon={HiOutlineHandRaised} accent="primary" />
        </div>
      )}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Quick actions</h3>
        <QuickActionGrid actions={quickActions} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Elections created over time" description={`Last ${days} days`}>
          <ElectionsOverTimeChart data={charts.elections_over_time} />
        </ChartPanel>
        <ChartPanel title="User distribution by role">
          <UserRolePieChart data={charts.user_distribution} />
        </ChartPanel>
        <ChartPanel title="Voting participation" description="Votes vs registered voters">
          <VotingParticipationChart data={charts.voting_participation} />
        </ChartPanel>
        <ChartPanel title="Active vs completed elections">
          <ElectionStatusPieChart data={charts.election_status_split} />
        </ChartPanel>
        <div className="xl:col-span-2">
          <ChartPanel title="Daily activity trends" description="Audit log volume">
            <DailyActivityChart data={charts.daily_activity} />
          </ChartPanel>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent activity</h3>
            <p className="text-xs text-slate-500">Logins, approvals, registrations, publications</p>
          </div>
          <Input
            value={activitySearch}
            onChange={(e) => setActivitySearch(e.target.value)}
            placeholder="Search activity…"
            className="max-w-xs"
          />
        </div>
        <RecentActivityList items={filteredActivity} loading={loading} />
      </section>
    </div>
  );
}
