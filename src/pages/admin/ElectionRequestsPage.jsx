import { useState } from 'react';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/elections/Pagination';
import ElectionRequestFilters from '../../components/admin/ElectionRequestFilters';
import ElectionRequestsTable from '../../components/admin/ElectionRequestsTable';
import ElectionRequestDetailsModal from '../../components/admin/ElectionRequestDetailsModal';
import ApproveElectionModal from '../../components/admin/ApproveElectionModal';
import RejectElectionModal from '../../components/admin/RejectElectionModal';
import { useAuth } from '../../hooks/useAuth';
import { useElectionRequests } from '../../hooks/useElectionRequests';
import {
  approveElectionRequest,
  rejectElectionRequest,
  fetchElectionRequestById,
} from '../../services/electionApprovalService';

export default function ElectionRequestsPage() {
  const { user } = useAuth();
  const {
    requests,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    totalPages,
    totalItems,
    pageSize,
    refresh,
  } = useElectionRequests();

  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleView(election) {
    setSelected(election);
    setDetailLoading(true);
    try {
      const full = await fetchElectionRequestById(election.id);
      setSelected(full);
    } catch {
      toast.error('Could not load election details.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setSubmitting(true);
    setActionLoadingId(approveTarget.id);
    try {
      const result = await approveElectionRequest(approveTarget.id, user.id);
      if (result.email_sent) {
        toast.success('Election approved. Creator has been notified by email.');
      } else {
        toast.success('Election approved.');
        toast.error(result.email_error ?? 'Approval email was not sent.');
      }
      setApproveTarget(null);
      setSelected(null);
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to approve election.');
    } finally {
      setSubmitting(false);
      setActionLoadingId(null);
    }
  }

  async function handleReject(reason) {
    if (!rejectTarget) return;
    setSubmitting(true);
    setActionLoadingId(rejectTarget.id);
    try {
      const result = await rejectElectionRequest(rejectTarget.id, user.id, reason);
      if (result.email_sent) {
        toast.success('Election rejected. Creator has been notified by email.');
      } else {
        toast.success('Election rejected.');
        toast.error(result.email_error ?? 'Rejection email was not sent.');
      }
      setRejectTarget(null);
      setSelected(null);
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to reject election.');
    } finally {
      setSubmitting(false);
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">New election requests</h2>
        <p className="mt-1 text-slate-600">
          Review creator details, approve or reject elections, and notify creators by
          email.
        </p>
      </div>

      <ElectionRequestFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <ElectionRequestsTable
            elections={requests}
            onView={handleView}
            onApprove={setApproveTarget}
            onReject={setRejectTarget}
            actionLoadingId={actionLoadingId}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </>
      )}

      <ElectionRequestDetailsModal
        open={Boolean(selected)}
        election={detailLoading ? null : selected}
        onClose={() => setSelected(null)}
      />
      <ApproveElectionModal
        open={Boolean(approveTarget)}
        election={approveTarget}
        onClose={() => !submitting && setApproveTarget(null)}
        onConfirm={handleApprove}
        isLoading={submitting}
      />
      <RejectElectionModal
        open={Boolean(rejectTarget)}
        election={rejectTarget}
        onClose={() => !submitting && setRejectTarget(null)}
        onConfirm={handleReject}
        isLoading={submitting}
      />
    </div>
  );
}
