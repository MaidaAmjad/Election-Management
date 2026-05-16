import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import ElectionForm from '../../components/elections/ElectionForm';
import ElectionStatusBadge from '../../components/elections/ElectionStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import {
  createElectionDraft,
  fetchElectionById,
  publishElection,
  updateElectionDraft,
} from '../../services/electionService';
import { ROUTES } from '../../utils/constants';
import { ELECTION_STATUS } from '../../utils/electionConstants';
import { isElectionEditable } from '../../utils/electionStatus';
import {
  emptyElectionForm,
  electionToForm,
  hasValidationErrors,
  validateElectionForm,
} from '../../utils/electionValidation';

export default function ElectionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyElectionForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [electionStatus, setElectionStatus] = useState(ELECTION_STATUS.DRAFT);

  useEffect(() => {
    if (!isEdit || !user?.id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const election = await fetchElectionById(id, user.id);

        if (!isElectionEditable(election)) {
          toast.error('Published elections cannot be edited.');
          navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${id}`, { replace: true });
          return;
        }

        if (!cancelled) {
          setForm(electionToForm(election, election.polls));
          setElectionStatus(election.status);
        }
      } catch (err) {
        toast.error(err.message ?? 'Failed to load election.');
        navigate(ROUTES.CREATOR_DASHBOARD, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate, user?.id]);

  async function handleSaveDraft() {
    const validationErrors = validateElectionForm(form, { isPublish: false });
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      toast.error('Fix the highlighted errors before saving.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateElectionDraft(id, user.id, form);
        toast.success('Draft updated.');
      } else {
        const created = await createElectionDraft(user.id, form);
        toast.success('Election saved as draft.');
        navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${created.id}/edit`, {
          replace: true,
        });
      }
    } catch (err) {
      toast.error(err.message ?? 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }

  function handlePublishClick() {
    const validationErrors = validateElectionForm(form, { isPublish: true });
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      toast.error('Complete all required fields before publishing.');
      return;
    }

    setPublishOpen(true);
  }

  async function confirmPublish() {
    setPublishing(true);
    try {
      let electionId = id;

      if (!isEdit) {
        const created = await createElectionDraft(user.id, form);
        electionId = created.id;
      } else {
        await updateElectionDraft(id, user.id, form);
      }

      await publishElection(electionId, user.id, form);
      toast.success('Election published successfully.');
      setPublishOpen(false);
      navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${electionId}`);
    } catch (err) {
      toast.error(err.message ?? 'Failed to publish election.');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={ROUTES.CREATOR_DASHBOARD}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to my elections
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Edit election' : 'Create new election'}
          </h2>
          <p className="mt-1 text-slate-600">
            {isEdit
              ? 'Update your draft and publish when ready.'
              : 'Fill in the details and save as a draft or publish.'}
          </p>
        </div>
        <ElectionStatusBadge status={electionStatus} />
      </div>

      <ElectionForm form={form} onChange={setForm} errors={errors} />

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(ROUTES.CREATOR_DASHBOARD)}
          disabled={saving || publishing}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSaveDraft}
          isLoading={saving}
          disabled={publishing}
        >
          Save as draft
        </Button>
        <Button
          type="button"
          onClick={handlePublishClick}
          disabled={saving || publishing}
        >
          Publish election
        </Button>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => !publishing && setPublishOpen(false)}
        title="Publish election?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPublishOpen(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button onClick={confirmPublish} isLoading={publishing}>
              Publish
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Once published, this election becomes read-only. Voters can participate
          according to the schedule you set. Continue?
        </p>
      </Modal>
    </div>
  );
}
