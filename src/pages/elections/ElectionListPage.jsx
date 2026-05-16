import { Link } from 'react-router-dom';
import { HiOutlinePlus } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import ElectionFilters from '../../components/elections/ElectionFilters';
import ElectionTable from '../../components/elections/ElectionTable';
import Pagination from '../../components/elections/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { useElections } from '../../hooks/useElections';
import {
  deleteElectionDraft,
  fetchElectionById,
  publishElection,
} from '../../services/electionService';
import { ROUTES } from '../../utils/constants';
import {
  electionToForm,
  validateElectionForm,
  hasValidationErrors,
} from '../../utils/electionValidation';

export default function ElectionListPage() {
  const { user } = useAuth();
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
    refresh,
  } = useElections(user?.id);

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishSubmitting, setPublishSubmitting] = useState(false);

  async function handleDelete(electionId) {
    if (!window.confirm('Delete this draft election? This cannot be undone.')) {
      return;
    }

    setActionLoadingId(electionId);
    try {
      await deleteElectionDraft(electionId, user.id);
      toast.success('Draft election deleted.');
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to delete election.');
    } finally {
      setActionLoadingId(null);
    }
  }

  function handlePublishClick(election) {
    setPublishTarget(election);
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
        setPublishTarget(null);
        return;
      }

      await publishElection(publishTarget.id, user.id, form);
      toast.success('Election published successfully.');
      setPublishTarget(null);
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to publish election.');
    } finally {
      setPublishSubmitting(false);
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Elections</h2>
          <p className="mt-1 text-slate-600">
            Create, manage, and publish your elections.
          </p>
        </div>
        <Link to={`${ROUTES.CREATOR_DASHBOARD}/elections/new`}>
          <Button className="gap-2">
            <HiOutlinePlus className="h-5 w-5" aria-hidden="true" />
            Create new election
          </Button>
        </Link>
      </div>

      <ElectionFilters
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
          <ElectionTable
            elections={elections}
            onPublish={(election) => {
              setActionLoadingId(election.id);
              handlePublishClick(election);
            }}
            onDelete={handleDelete}
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

      <Modal
        open={Boolean(publishTarget)}
        onClose={() => !publishSubmitting && setPublishTarget(null)}
        title="Publish election?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPublishTarget(null)}
              disabled={publishSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={confirmPublish} isLoading={publishSubmitting}>
              Publish
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Publishing <strong>{publishTarget?.title}</strong> will make it
          read-only. Voters can participate according to the schedule you set.
          Continue?
        </p>
      </Modal>
    </div>
  );
}

