import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlinePlus } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import CandidateFilters from '../../components/candidates/CandidateFilters';
import CandidateTable from '../../components/candidates/CandidateTable';
import CandidatePagination from '../../components/candidates/CandidatePagination';
import DeleteCandidateModal from '../../components/candidates/DeleteCandidateModal';
import { useAuth } from '../../hooks/useAuth';
import { useCandidates } from '../../hooks/useCandidates';
import { deleteCandidate } from '../../services/candidateService';
import { ROUTES } from '../../utils/constants';

export default function CandidateListPage() {
  const { user } = useAuth();
  const {
    candidates,
    loading,
    error,
    search,
    setSearch,
    electionFilter,
    setElectionFilter,
    sortBy,
    setSortBy,
    page,
    setPage,
    totalPages,
    totalItems,
    pageSize,
    electionOptions,
    refresh,
  } = useCandidates(user?.id);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);
    setActionLoadingId(deleteTarget.id);

    try {
      await deleteCandidate(deleteTarget.id, user.id);
      toast.success('Candidate deleted successfully.');
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to delete candidate.');
    } finally {
      setDeleteSubmitting(false);
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to={ROUTES.CREATOR_CANDIDATES}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← Candidate dashboard
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            All candidates
          </h2>
        </div>
        <Link to={`${ROUTES.CREATOR_CANDIDATES}/new`}>
          <Button className="gap-2">
            <HiOutlinePlus className="h-4 w-4" />
            Add candidate
          </Button>
        </Link>
      </div>

      <CandidateFilters
        search={search}
        onSearchChange={setSearch}
        electionFilter={electionFilter}
        onElectionFilterChange={setElectionFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        electionOptions={electionOptions}
      />

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-lg font-medium text-slate-900">No candidates yet</p>
          <p className="mt-2 text-sm text-slate-600">
            Add your first candidate to get started.
          </p>
          <Link to={`${ROUTES.CREATOR_CANDIDATES}/new`} className="mt-6 inline-block">
            <Button>Add candidate</Button>
          </Link>
        </div>
      ) : (
        <>
          <CandidateTable
            candidates={candidates}
            onDelete={setDeleteTarget}
            actionLoadingId={actionLoadingId}
          />
          <CandidatePagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </>
      )}

      <DeleteCandidateModal
        open={Boolean(deleteTarget)}
        onClose={() => !deleteSubmitting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        candidateName={deleteTarget?.name}
        submitting={deleteSubmitting}
      />
    </motion>
  );
}
