import { useState } from 'react';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/elections/Pagination';
import RequestFilters from '../../components/admin/RequestFilters';
import RequestsTable from '../../components/admin/RequestsTable';
import RequestDetailsModal from '../../components/admin/RequestDetailsModal';
import ApproveRequestModal from '../../components/admin/ApproveRequestModal';
import RejectRequestModal from '../../components/admin/RejectRequestModal';
import { useAuth } from '../../hooks/useAuth';
import { useCreatorRequests } from '../../hooks/useCreatorRequests';
import {
  approveCreatorRequest,
  rejectCreatorRequest,
} from '../../services/creatorRequestService';

export default function CreatorRequestsPage() {
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
  } = useCreatorRequests();

  const [selected, setSelected] = useState(null);
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    if (!approveTarget) return;
    setSubmitting(true);
    setActionLoadingId(approveTarget.id);
    try {
      await approveCreatorRequest(approveTarget.id, user.id);
      toast.success('Request approved. Creator has been notified by email.');
      setApproveTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to approve request.');
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
      await rejectCreatorRequest(rejectTarget.id, user.id, reason);
      toast.success('Request rejected. Creator has been notified by email.');
      setRejectTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to reject request.');
    } finally {
      setSubmitting(false);
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Election creator requests</h2>
        <p className="mt-1 text-slate-600">
          Review, approve, or reject new election creator applications.
        </p>
      </div>

      <RequestFilters
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
          <RequestsTable
            requests={requests}
            onView={setSelected}
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

      <RequestDetailsModal
        open={Boolean(selected)}
        request={selected}
        onClose={() => setSelected(null)}
      />
      <ApproveRequestModal
        open={Boolean(approveTarget)}
        request={approveTarget}
        onClose={() => !submitting && setApproveTarget(null)}
        onConfirm={handleApprove}
        isLoading={submitting}
      />
      <RejectRequestModal
        open={Boolean(rejectTarget)}
        request={rejectTarget}
        onClose={() => !submitting && setRejectTarget(null)}
        onConfirm={handleReject}
        isLoading={submitting}
      />
    </div>
  );
}
