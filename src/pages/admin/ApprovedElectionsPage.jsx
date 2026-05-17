import { useState } from 'react';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Pagination from '../../components/elections/Pagination';
import ApprovedElectionsTable from '../../components/admin/ApprovedElectionsTable';
import AdminElectionDetailModal from '../../components/admin/AdminElectionDetailModal';
import { useApprovedElections } from '../../hooks/useApprovedElections';
import { fetchAdminElectionById } from '../../services/adminElectionService';
import { ELECTION_STATUS_OPTIONS } from '../../utils/electionConstants';

export default function ApprovedElectionsPage() {
  const {
    elections,
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
  } = useApprovedElections();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailElection, setDetailElection] = useState(null);

  async function handleView(election) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailElection(null);
    try {
      const full = await fetchAdminElectionById(election.id);
      setDetailElection(full);
    } catch {
      setDetailElection(null);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Approved elections</h2>
        <p className="mt-1 text-slate-600">
          Elections that have been approved by Super Admin and are published on the
          platform.
        </p>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <Input
          id="election-search"
          label="Search elections"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Title, creator, category..."
        />
        <Select
          id="election-status-filter"
          label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {ELECTION_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </div>

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
          <ApprovedElectionsTable elections={elections} onView={handleView} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </>
      )}

      <AdminElectionDetailModal
        open={detailOpen}
        election={detailElection}
        loading={detailLoading}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
