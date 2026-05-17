import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import GenerateSecretIdsPanel from '../../components/secretid/GenerateSecretIdsPanel';
import SecretIdManagementTable from '../../components/secretid/SecretIdManagementTable';
import SecretIdLogsPanel from '../../components/secretid/SecretIdLogsPanel';
import { useAuth } from '../../hooks/useAuth';
import { useElectionFinalization } from '../../hooks/useElectionFinalization';
import { useSecretIds } from '../../hooks/useSecretIds';
import { hasRole } from '../../utils/roleHelpers';
import { USER_ROLES } from '../../utils/constants';
import { sendAllSecretIdEmails } from '../../services/secretIdService';

export default function SecretIdElectionPage({ listPath }) {
  const { id } = useParams();
  const { role } = useAuth();
  const isAdmin = hasRole(role, [USER_ROLES.SUPER_ADMIN]);
  const [activeTab, setActiveTab] = useState('ids');
  const [retryingEmails, setRetryingEmails] = useState(false);

  const { election, loading, error, refresh } = useElectionFinalization(id);
  const secretIds = useSecretIds(id);

  async function handleRetryFailed() {
    setRetryingEmails(true);
    try {
      const result = await sendAllSecretIdEmails(id);
      toast.success(
        `Retry complete — sent: ${result.sent ?? 0}, failed: ${result.failed ?? 0}`,
      );
      secretIds.refresh();
    } catch (err) {
      toast.error(err.message ?? 'Could not retry emails.');
    } finally {
      setRetryingEmails(false);
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
    return <p className="text-red-600">{error ?? 'Election not found.'}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={listPath}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Secret ID Management</h2>
        <p className="mt-1 text-slate-600">{election.title}</p>
      </div>

      <GenerateSecretIdsPanel
        election={election}
        hasSecretIds={secretIds.hasSecretIds}
        onComplete={() => {
          refresh();
          secretIds.refresh();
        }}
      />

      {secretIds.hasSecretIds && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div className="flex gap-2">
              <TabButton active={activeTab === 'ids'} onClick={() => setActiveTab('ids')}>
                Secret IDs
              </TabButton>
              <TabButton
                active={activeTab === 'logs'}
                onClick={() => setActiveTab('logs')}
              >
                Activity logs
              </TabButton>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetryFailed}
              isLoading={retryingEmails}
            >
              Retry failed emails
            </Button>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'ids' && (
              <SecretIdManagementTable
                electionTitle={election.title}
                rows={secretIds.rows}
                paginated={secretIds.paginated}
                loading={secretIds.loading}
                search={secretIds.search}
                onSearchChange={secretIds.setSearch}
                emailStatus={secretIds.emailStatus}
                onEmailStatusChange={secretIds.setEmailStatus}
                pollId={secretIds.pollId}
                onPollIdChange={secretIds.setPollId}
                pollOptions={secretIds.pollOptions}
                page={secretIds.page}
                onPageChange={secretIds.setPage}
                totalPages={secretIds.totalPages}
                totalFiltered={secretIds.filtered.length}
                isAdmin={isAdmin}
                onRefresh={secretIds.refresh}
              />
            )}
            {activeTab === 'logs' && (
              <SecretIdLogsPanel logs={secretIds.logs} />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg px-3 py-2 text-sm font-medium',
        active
          ? 'bg-primary-100 text-primary-800'
          : 'text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
