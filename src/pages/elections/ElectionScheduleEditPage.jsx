import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import ElectionScheduleForm from '../../components/elections/ElectionScheduleForm';
import ElectionStatusBadge from '../../components/elections/ElectionStatusBadge';
import ElectionApprovalStatusBadge from '../../components/elections/ElectionApprovalStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchElectionById,
  updateApprovedElectionSchedule,
} from '../../services/electionService';
import { ROUTES } from '../../utils/constants';
import {
  canEditApprovedElectionSchedule,
  getEffectiveStatus,
  isMaxVotersLockedForScheduleEdit,
} from '../../utils/electionStatus';
import {
  toDatetimeLocalValue,
  validateApprovedElectionScheduleForm,
} from '../../utils/electionValidation';

function buildScheduleForm(election) {
  return {
    start_datetime: toDatetimeLocalValue(election.start_datetime),
    end_datetime: toDatetimeLocalValue(election.end_datetime),
    registration_deadline: toDatetimeLocalValue(election.registration_deadline),
    max_voters: String(election.max_voters ?? ''),
    original_end_datetime: election.end_datetime,
  };
}

export default function ElectionScheduleEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [election, setElection] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const votingHasStarted = useMemo(() => {
    if (!election?.start_datetime) return false;
    return Date.now() >= new Date(election.start_datetime).getTime();
  }, [election?.start_datetime]);

  const electionHasEnded = useMemo(() => {
    if (!election?.end_datetime) return false;
    return Date.now() > new Date(election.end_datetime).getTime();
  }, [election?.end_datetime]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchElectionById(id, user.id);
        if (!canEditApprovedElectionSchedule(data)) {
          toast.error('This election cannot be edited.');
          navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${id}`, { replace: true });
          return;
        }
        if (!cancelled) {
          setElection(data);
          setForm(buildScheduleForm(data));
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
  }, [id, navigate, user?.id]);

  async function handleSave(event) {
    event.preventDefault();
    const validationErrors = validateApprovedElectionScheduleForm(form, {
      votingHasStarted,
      electionHasEnded,
      originalStartDatetime: toDatetimeLocalValue(election.start_datetime),
      originalRegistrationDeadline: toDatetimeLocalValue(
        election.registration_deadline,
      ),
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      await updateApprovedElectionSchedule(id, form);
      toast.success('Election schedule updated.');
      navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${id}`, { replace: true });
    } catch (err) {
      toast.error(err.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!election || !form) {
    return null;
  }

  const scheduleFieldsLocked = isMaxVotersLockedForScheduleEdit(election);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to={`${ROUTES.CREATOR_DASHBOARD}/elections/${id}`}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to election
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Edit schedule</h2>
        <p className="mt-1 text-slate-600">{election.title}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ElectionStatusBadge status={getEffectiveStatus(election)} />
          <ElectionApprovalStatusBadge status={election.approval_status} />
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <ElectionScheduleForm
          form={form}
          onChange={setForm}
          errors={errors}
          startDisabled={votingHasStarted}
          registrationDeadlineDisabled={scheduleFieldsLocked || votingHasStarted}
          maxVotersDisabled={scheduleFieldsLocked}
        />

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`${ROUTES.CREATOR_DASHBOARD}/elections/${id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
