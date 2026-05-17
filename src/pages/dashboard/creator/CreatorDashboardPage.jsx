import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiOutlinePencilSquare,
  HiOutlineUserGroup,
  HiOutlineKey,
  HiOutlineUsers,
  HiOutlinePlus,
} from 'react-icons/hi2';
import DashboardStatCard from '../../../components/dashboard/DashboardStatCard';
import StatCardSkeleton from '../../../components/dashboard/StatCardSkeleton';
import QuickActionGrid from '../../../components/dashboard/QuickActionGrid';
import CreatorDashboardElectionsTable from '../../../components/dashboard/CreatorDashboardElectionsTable';
import ResultsSummaryCards from '../../../components/dashboard/ResultsSummaryCards';
import ElectionFilters from '../../../components/elections/ElectionFilters';
import Pagination from '../../../components/elections/Pagination';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { useAuth } from '../../../hooks/useAuth';
import { useCreatorDashboard } from '../../../hooks/useCreatorDashboard';
import {
  deleteElectionDraft,
  fetchElectionById,
  publishElection,
} from '../../../services/electionService';
import { ROUTES } from '../../../utils/constants';
import { DEFAULT_PAGE_SIZE } from '../../../utils/electionConstants';
import {
  electionToForm,
  validateElectionForm,
  hasValidationErrors,
} from '../../../utils/electionValidation';

export default function CreatorDashboardPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishSubmitting, setPublishSubmitting] = useState(false);

  const {
    stats,
    elections,
    totalElections,
    totalPages,
    results,
    loading,
    error,
    refresh,
  } = useCreatorDashboard({
    search,
    statusFilter,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const cards = stats?.cards ?? {};

  async function handleDelete(electionId) {
    if (!window.confirm('Delete this draft election?')) return;
    setActionLoadingId(electionId);
    try {
      await deleteElectionDraft(electionId, user.id);
      toast.success('Draft deleted.');
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Delete failed.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function confirmPublish() {
    if (!publishTarget) return;
    setPublishSubmitting(true);
    try {
      const full = await fetchElectionById(publishTarget.id, user.id);
      const form = electionToForm(full, full.polls);
      const errors = validateElectionForm(form, { isPublish: true });
      if (hasValidationErrors(errors)) {
        toast.error('Complete all required fields before publishing.');
        return;
      }
      await publishElection(publishTarget.id, user.id, form);
      toast.success('Election published.');
      setPublishTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Publish failed.');
    } finally {
      setPublishSubmitting(false);
    }
  }

  const quickActions = [
    { label: 'Create new election', to: `${ROUTES.CREATOR_DASHBOARD}/elections/new`, icon: HiOutlinePlus },
    { label: 'Add candidates', to: `${ROUTES.CREATOR_CANDIDATES}/new`, icon: HiOutlineUserGroup },
    { label: 'Generate secret IDs', to: ROUTES.CREATOR_SECRET_IDS, icon: HiOutlineKey },
    { label: 'Finalize voters', to: ROUTES.CREATOR_FINALIZED_VOTERS, icon: HiOutlineUsers },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Election Creator Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            Manage elections, track voters and results — live updates enabled.
          </p>
        </div>
        <Link to={`${ROUTES.CREATOR_DASHBOARD}/elections/new`}>
          <Button className="gap-2">
            <HiOutlinePlus className="h-4 w-4" />
            New election
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <StatCardSkeleton count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardStatCard label="My elections" value={cards.my_elections} icon={HiOutlineDocumentText} />
          <DashboardStatCard label="Active elections" value={cards.active_elections} icon={HiOutlineChartBar} accent="emerald" />
          <DashboardStatCard label="Draft elections" value={cards.draft_elections} icon={HiOutlinePencilSquare} accent="amber" />
          <DashboardStatCard label="Completed elections" value={cards.completed_elections} icon={HiOutlineChartBar} accent="violet" />
          <DashboardStatCard label="Total candidates" value={cards.total_candidates} icon={HiOutlineUserGroup} />
          <DashboardStatCard label="Registered voters" value={cards.total_registered_voters} icon={HiOutlineUsers} />
        </div>
      )}

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Quick actions</h3>
        <QuickActionGrid actions={quickActions} />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">My elections</h3>
          <Link
            to={ROUTES.CREATOR_ELECTIONS}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View all elections →
          </Link>
        </div>
        <ElectionFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        />
        <CreatorDashboardElectionsTable
          elections={elections}
          onPublish={setPublishTarget}
          onDelete={handleDelete}
          actionLoadingId={actionLoadingId}
        />
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalElections}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setPage}
        />
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold text-slate-900">Results overview</h3>
        <ResultsSummaryCards
          items={results}
          resultsBasePath={ROUTES.CREATOR_RESULTS}
          emptyMessage="Completed elections will appear here with winner and turnout data."
        />
      </section>

      <Modal
        open={Boolean(publishTarget)}
        onClose={() => !publishSubmitting && setPublishTarget(null)}
        title="Publish election"
      >
        <p className="text-sm text-slate-600">
          Publish <strong>{publishTarget?.title}</strong>? It becomes read-only for voters.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" disabled={publishSubmitting} onClick={() => setPublishTarget(null)}>
            Cancel
          </Button>
          <Button onClick={confirmPublish} isLoading={publishSubmitting}>
            Publish
          </Button>
        </div>
      </Modal>
    </div>
  );
}
