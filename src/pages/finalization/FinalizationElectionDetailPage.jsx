import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import FinalizationControlsPanel from '../../components/finalization/FinalizationControlsPanel';
import FinalizedVoterTable from '../../components/finalization/FinalizedVoterTable';
import RegistrationStatusBadge from '../../components/finalization/RegistrationStatusBadge';
import VoterLockLogsPanel from '../../components/finalization/VoterLockLogsPanel';
import GenerateSecretIdsPanel from '../../components/secretid/GenerateSecretIdsPanel';
import { useAuth } from '../../hooks/useAuth';
import { countSecretIdsForElection } from '../../services/secretIdService';
import { useElectionFinalization } from '../../hooks/useElectionFinalization';
import { useFinalizedVoters } from '../../hooks/useFinalizedVoters';
import { formatElectionDate } from '../../utils/electionFormatters';
import { exportVotersToCsv, exportVotersToPdf } from '../../utils/exportVoterList';
import { REGISTRATION_STATUS } from '../../utils/finalizationConstants';
import { hasRole } from '../../utils/roleHelpers';
import { ROUTES, USER_ROLES } from '../../utils/constants';

export default function FinalizationElectionDetailPage({ listPath }) {
  const { id } = useParams();
  const { user, role } = useAuth();
  const isAdmin = hasRole(role, [USER_ROLES.SUPER_ADMIN]);
  const [activeTab, setActiveTab] = useState('voters');
  const [removeRequest, setRemoveRequest] = useState(null);
  const [hasSecretIds, setHasSecretIds] = useState(false);

  const secretIdsPath = isAdmin
    ? `${ROUTES.ADMIN_SECRET_IDS}/${id}`
    : `${ROUTES.CREATOR_SECRET_IDS}/${id}`;

  const refreshSecretIdCount = useCallback(async () => {
    if (!id) return;
    try {
      const count = await countSecretIdsForElection(id);
      setHasSecretIds(count > 0);
    } catch {
      setHasSecretIds(false);
    }
  }, [id]);

  const {
    election,
    activeCount,
    logs,
    loading,
    error,
    refresh,
    refreshLogs,
  } = useElectionFinalization(id);

  const voterTable = useFinalizedVoters(id);

  useEffect(() => {
    if (election?.registration_status === REGISTRATION_STATUS.FINALIZED) {
      refreshSecretIdCount();
    }
  }, [election?.registration_status, refreshSecretIdCount]);

  const canFinalize =
    isAdmin || (election && election.creator_id === user?.id);

  function handleExportCsv() {
    exportVotersToCsv(voterTable.filtered, election?.title);
    toast.success('CSV downloaded.');
  }

  function handleExportPdf() {
    exportVotersToPdf(voterTable.filtered, election?.title);
    toast.success('PDF downloaded.');
  }

  async function handleUpdated() {
    await refresh();
    await voterTable.refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !election) {
    return <p className="text-red-600">{error ?? 'Election not found.'}</p>;
  }

  const canAdminRemove =
    isAdmin && election.registration_status !== REGISTRATION_STATUS.FINALIZED;

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={listPath}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to finalized voters
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{election.title}</h2>
            <p className="mt-1 text-slate-600">
              Registration management and voter list export
            </p>
          </div>
          <RegistrationStatusBadge status={election.registration_status} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total voters" value={String(activeCount)} />
        <StatCard label="Maximum voters" value={String(election.max_voters)} />
        <StatCard
          label="Locked date"
          value={election.locked_at ? formatElectionDate(election.locked_at) : '—'}
        />
        <StatCard
          label="Finalized date"
          value={
            election.finalized_at
              ? formatElectionDate(election.finalized_at)
              : '—'
          }
        />
      </section>

      <FinalizationControlsPanel
        election={election}
        activeCount={activeCount}
        isAdmin={isAdmin}
        canFinalize={canFinalize}
        onUpdated={handleUpdated}
        removeRequest={removeRequest}
        onRemoveRequestHandled={() => setRemoveRequest(null)}
      />

      {election.registration_status === REGISTRATION_STATUS.FINALIZED && (
        <section className="space-y-3">
          <GenerateSecretIdsPanel
            election={election}
            hasSecretIds={hasSecretIds}
            onComplete={refreshSecretIdCount}
          />
          {hasSecretIds && (
            <Link
              to={secretIdsPath}
              className="inline-flex text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Open Secret ID Management →
            </Link>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4">
          <TabButton
            active={activeTab === 'voters'}
            onClick={() => setActiveTab('voters')}
          >
            View voters
          </TabButton>
          <TabButton
            active={activeTab === 'logs'}
            onClick={() => setActiveTab('logs')}
          >
            View logs
          </TabButton>
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'voters' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  Generate finalized list
                </h3>
                <Button variant="secondary" size="sm" onClick={voterTable.refresh}>
                  Refresh list
                </Button>
              </div>
              <FinalizedVoterTable
                voters={voterTable.filtered}
                loading={voterTable.loading}
                search={voterTable.search}
                onSearchChange={voterTable.setSearch}
                statusFilter={voterTable.statusFilter}
                onStatusFilterChange={voterTable.setStatusFilter}
                statusOptions={voterTable.statusOptions}
                pagination={voterTable.pagination}
                onPageChange={voterTable.setPage}
                onExportCsv={handleExportCsv}
                onExportPdf={handleExportPdf}
                isAdmin={canAdminRemove}
                onRemoveVoter={(voter) => setRemoveRequest(voter)}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Override & lock logs
                </h3>
                <Button variant="secondary" size="sm" onClick={refreshLogs}>
                  Refresh logs
                </Button>
              </div>
              <VoterLockLogsPanel logs={logs} loading={false} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-primary-600 text-primary-700'
          : 'border-transparent text-slate-600 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
