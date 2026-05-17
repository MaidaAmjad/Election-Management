import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineSignal } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';
import ResultsBarChart from '../../charts/ResultsBarChart';
import ResultsPieChart from '../../charts/ResultsPieChart';
import ResultsLineChart from '../../charts/ResultsLineChart';
import CandidateResultsTable from '../../components/results/CandidateResultsTable';
import CandidateProgressBars from '../../components/results/CandidateProgressBars';
import TurnoutStats from '../../components/results/TurnoutStats';
import WinnerCard from '../../components/results/WinnerCard';
import ResultsLockedBanner from '../../components/results/ResultsLockedBanner';
import ResultsExportMenu from '../../components/results/ResultsExportMenu';
import PollResultsFilter from '../../components/results/PollResultsFilter';
import { useAuth } from '../../hooks/useAuth';
import { useLiveResults } from '../../hooks/useLiveResults';
import { unlockElectionResults } from '../../services/resultsService';
import { buildChartData, buildTrendChartData } from '../../utils/resultsCalculations';
import { hasRole } from '../../utils/roleHelpers';
import { USER_ROLES } from '../../utils/constants';

export default function LiveResultsPage({ listPath }) {
  const { id } = useParams();
  const { role } = useAuth();
  const isAdmin = hasRole(role, [USER_ROLES.SUPER_ADMIN]);
  const [pollFilter, setPollFilter] = useState('all');
  const [unlocking, setUnlocking] = useState(false);

  const pollId = pollFilter === 'all' ? null : pollFilter;

  const {
    election,
    candidates,
    tiedCandidates,
    turnout,
    voteTrend,
    polls,
    winner,
    isTie,
    isLive,
    totalVotes,
    loading,
    error,
    refresh,
  } = useLiveResults(id, pollId);

  const chartData = useMemo(() => buildChartData(candidates), [candidates]);
  const trendData = useMemo(() => buildTrendChartData(voteTrend), [voteTrend]);

  const exportPayload = useMemo(
    () =>
      election
        ? {
            election,
            candidates,
            turnout,
            winner,
            isTie,
            tiedCandidates,
            totalVotes,
          }
        : null,
    [election, candidates, turnout, winner, isTie, tiedCandidates, totalVotes],
  );

  async function handleUnlock() {
    setUnlocking(true);
    try {
      const result = await unlockElectionResults(id);
      if (!result?.success) {
        toast.error(result?.message ?? 'Could not unlock results.');
        return;
      }
      toast.success(result.message ?? 'Results unlocked.');
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Could not unlock results.');
    } finally {
      setUnlocking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !election) {
    return <p className="text-red-600">{error ?? 'Results not available.'}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={listPath}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to results history
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{election.title}</h2>
            <p className="mt-1 text-slate-600">Live Results Dashboard</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
                <HiOutlineSignal className="h-3.5 w-3.5" />
                Live updating
              </span>
            )}
            <ResultsExportMenu exportPayload={exportPayload} disabled={!candidates.length} />
          </div>
        </div>
      </div>

      <ResultsLockedBanner
        election={election}
        isAdmin={isAdmin}
        onUnlock={handleUnlock}
        unlocking={unlocking}
      />

      <PollResultsFilter polls={polls} value={pollFilter} onChange={setPollFilter} />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Total votes" value={String(totalVotes)} />
        <SummaryCard label="Result status" value={election.result_status} />
        <SummaryCard
          label="Election status"
          value={election.status}
        />
      </div>

      <WinnerCard
        election={election}
        winner={winner}
        isTie={isTie}
        tiedCandidates={tiedCandidates}
      />

      <TurnoutStats turnout={turnout} election={election} />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Candidate rankings</h3>
        <div className="mt-4">
          <CandidateResultsTable candidates={candidates} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Vote share</h3>
        <div className="mt-4">
          <CandidateProgressBars candidates={candidates} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Bar chart — votes by candidate">
          <ResultsBarChart data={chartData} />
        </ChartCard>
        <ChartCard title="Pie chart — vote share">
          <ResultsPieChart data={chartData} />
        </ChartCard>
      </div>

      <ChartCard title="Line chart — vote trend over time">
        <ResultsLineChart data={trendData} />
      </ChartCard>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
