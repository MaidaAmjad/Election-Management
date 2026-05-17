import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import ElectionWizardSteps from '../../components/elections/ElectionWizardSteps';
import ElectionDetailsStep from '../../components/elections/ElectionDetailsStep';
import ElectionCandidatesStep from '../../components/elections/ElectionCandidatesStep';
import { PollsOnlyStep } from '../../components/elections/PollCandidatesStep';
import ElectionStatusBadge from '../../components/elections/ElectionStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import {
  assertElectionReadyToPublish,
  createElectionDraft,
  ensureStagingPoll,
  fetchElectionById,
  updateElectionDraft,
} from '../../services/electionService';
import { submitElectionForApproval } from '../../services/electionApprovalService';
import ElectionApprovalStatusBadge from '../../components/elections/ElectionApprovalStatusBadge';
import { ROUTES } from '../../utils/constants';
import { ELECTION_STATUS } from '../../utils/electionConstants';
import { isElectionEditable } from '../../utils/electionStatus';
import { getStagingPoll } from '../../utils/pollCandidatesLoader';
import {
  emptyElectionForm,
  emptyPoll,
  electionToForm,
  hasValidationErrors,
  validateElectionForm,
  validateStagingCandidates,
  WIZARD_STEPS,
} from '../../utils/electionValidation';

export default function ElectionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);

  const [step, setStep] = useState(WIZARD_STEPS.DETAILS);
  const [form, setForm] = useState(emptyElectionForm);
  const [electionId, setElectionId] = useState(id ?? null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [electionStatus, setElectionStatus] = useState(ELECTION_STATUS.DRAFT);
  const [approvalStatus, setApprovalStatus] = useState(null);

  const stagingPoll = getStagingPoll(form.polls ?? []);
  const candidatePool = stagingPoll?.candidates ?? [];

  useEffect(() => {
    if (!isEdit || !user?.id) return undefined;

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
          setElectionId(election.id);
          setElectionStatus(election.status);
          setApprovalStatus(election.approval_status ?? null);
        }
      } catch (err) {
        toast.error(err.message ?? 'Failed to load election.');
        navigate(ROUTES.CREATOR_ELECTIONS, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, navigate, user?.id]);

  function handleStagingCandidatesChange(candidates) {
    if (!stagingPoll?.id) return;
    setForm((prev) => ({
      ...prev,
      polls: prev.polls.map((p) =>
        p.id === stagingPoll.id ? { ...p, candidates } : p,
      ),
    }));
  }

  async function persistDraft({ includePolls = true } = {}) {
    const validationErrors = validateElectionForm(form, {
      isPublish: false,
      includePolls,
    });
    setErrors(validationErrors);
    if (hasValidationErrors(validationErrors)) {
      throw new Error('Fix the highlighted errors.');
    }

    if (electionId) {
      const updated = await updateElectionDraft(electionId, user.id, form);
      return updated;
    }

    const created = await createElectionDraft(user.id, form);
    setElectionId(created.id);
    navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${created.id}/edit`, {
      replace: true,
    });
    return created;
  }

  async function refreshFormFromServer(targetId = electionId) {
    const full = await fetchElectionById(targetId, user.id);
    setForm(electionToForm(full, full.polls));
    return full;
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const saved = await persistDraft();
      setForm(electionToForm(saved, saved.polls));
      toast.success('Draft saved.');
    } catch (err) {
      toast.error(err.message ?? 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  }

  async function goToStep2() {
    const validationErrors = validateElectionForm(form, {
      isPublish: false,
      includePolls: false,
    });
    const detailErrors = { ...validationErrors };
    delete detailErrors.polls;
    delete detailErrors.pollsGeneral;
    setErrors(detailErrors);
    if (hasValidationErrors(detailErrors)) {
      toast.error('Complete election details before continuing.');
      return;
    }

    setSaving(true);
    try {
      const saved = await persistDraft({ includePolls: false });
      const idForPoll = saved.id ?? electionId;
      await ensureStagingPoll(idForPoll);
      await refreshFormFromServer(idForPoll);
      setStep(WIZARD_STEPS.CANDIDATES);
    } catch (err) {
      toast.error(err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function goToStep3() {
    const candidateErrors = validateStagingCandidates(form.polls ?? []);
    if (Object.keys(candidateErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...candidateErrors }));
      toast.error('Add at least one candidate before continuing.');
      return;
    }

    if (!electionId) {
      toast.error('Save the election first.');
      return;
    }

    setSaving(true);
    try {
      const full = await refreshFormFromServer();
      const loaded = full.polls ?? [];
      const staging = getStagingPoll(loaded);
      const hasDisplayPoll = loaded.some((p) => !p.isStaging);
      setForm((prev) => {
        const base = electionToForm(full, loaded);
        if (hasDisplayPoll) return base;
        return {
          ...base,
          polls: [...(staging ? [staging] : []), emptyPoll()],
        };
      });
      setErrors({});
      setStep(WIZARD_STEPS.POLLS);
    } catch (err) {
      toast.error(err.message ?? 'Failed to continue.');
    } finally {
      setSaving(false);
    }
  }

  function handlePublishClick() {
    const validationErrors = validateElectionForm(form, { isPublish: true });
    setErrors(validationErrors);
    if (hasValidationErrors(validationErrors)) {
      toast.error('Complete all polls before submitting.');
      return;
    }
    setPublishOpen(true);
  }

  async function confirmPublish() {
    if (!electionId) {
      toast.error('Save the election before publishing.');
      return;
    }

    setPublishing(true);
    try {
      await updateElectionDraft(electionId, user.id, form);
      await assertElectionReadyToPublish(electionId, user.id);
      await submitElectionForApproval(electionId, user.id);
      toast.success('Election submitted for admin approval. You will be notified by email.');
      setPublishOpen(false);
      setApprovalStatus('Pending');
      navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${electionId}`);
    } catch (err) {
      toast.error(err.message ?? 'Failed to submit election for approval.');
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
            to={ROUTES.CREATOR_ELECTIONS}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to my elections
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Edit election' : 'Create election'}
          </h2>
          <p className="mt-1 text-slate-600">
            Details → Candidates → Polls → Submit for approval
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ElectionStatusBadge status={electionStatus} />
          <ElectionApprovalStatusBadge status={approvalStatus} />
        </div>
      </div>

      <ElectionWizardSteps currentStep={step} />

      {step === WIZARD_STEPS.DETAILS && (
        <ElectionDetailsStep form={form} onChange={setForm} errors={errors} />
      )}

      {step === WIZARD_STEPS.CANDIDATES && electionId && (
        <ElectionCandidatesStep
          electionTitle={form.title}
          stagingPoll={stagingPoll}
          electionId={electionId}
          creatorId={user.id}
          candidates={stagingPoll?.candidates ?? []}
          onCandidatesChange={handleStagingCandidatesChange}
          candidateErrors={errors}
          readOnly={false}
        />
      )}

      {step === WIZARD_STEPS.POLLS && (
        <PollsOnlyStep
          polls={form.polls}
          poolCandidates={candidatePool}
          onChange={(polls) => setForm((prev) => ({ ...prev, polls }))}
          errors={errors}
        />
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(ROUTES.CREATOR_ELECTIONS)}
          disabled={saving || publishing}
        >
          Cancel
        </Button>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            isLoading={saving}
            disabled={publishing}
          >
            Save draft
          </Button>

          {step > WIZARD_STEPS.DETAILS && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving || publishing}
            >
              Back
            </Button>
          )}

          {step === WIZARD_STEPS.DETAILS && (
            <Button type="button" onClick={goToStep2} isLoading={saving} disabled={publishing}>
              Next: Add candidates
            </Button>
          )}

          {step === WIZARD_STEPS.CANDIDATES && (
            <Button type="button" onClick={goToStep3} isLoading={saving} disabled={publishing}>
              Next: Create polls
            </Button>
          )}

          {step === WIZARD_STEPS.POLLS && (
            <Button type="button" onClick={handlePublishClick} disabled={saving || publishing}>
              Submit for approval
            </Button>
          )}
        </div>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => !publishing && setPublishOpen(false)}
        title="Submit for admin approval?"
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
              Submit
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Your election will be sent to a Super Admin for review. Once approved, it
          will be published and visible to voters. You will receive an email when a
          decision is made.
        </p>
      </Modal>
    </div>
  );
}
