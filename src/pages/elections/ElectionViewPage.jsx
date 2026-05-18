import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlinePencilSquare } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import ElectionReadOnlyView from '../../components/elections/ElectionReadOnlyView';
import ElectionStatusBadge from '../../components/elections/ElectionStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { fetchElectionById } from '../../services/electionService';
import { ROUTES } from '../../utils/constants';
import {
  canEditApprovedElectionSchedule,
  isElectionEditable,
} from '../../utils/electionStatus';
import { electionToForm } from '../../utils/electionValidation';

export default function ElectionViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [election, setElection] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchElectionById(id, user.id);
        if (!cancelled) {
          setElection(data);
          setForm(electionToForm(data, data.polls));
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
  }, [id, navigate, user?.id]);

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

  const editable = isElectionEditable(election);
  const canEditSchedule = canEditApprovedElectionSchedule(election);

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
          <h2 className="text-2xl font-bold text-slate-900">{election.title}</h2>
          <p className="mt-1 text-slate-600">
            {editable
              ? 'This election is a draft. Edit or publish when ready.'
              : canEditSchedule
                ? 'Approved election — you can update the schedule and voter capacity below.'
                : 'This election is published and read-only.'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ElectionStatusBadge status={election.effectiveStatus} />
          {editable && (
            <Link to={`${ROUTES.CREATOR_DASHBOARD}/elections/${id}/edit`}>
              <Button variant="secondary" size="sm" className="gap-2">
                <HiOutlinePencilSquare className="h-4 w-4" aria-hidden="true" />
                Edit draft
              </Button>
            </Link>
          )}
          {canEditSchedule && (
            <Link to={`${ROUTES.CREATOR_DASHBOARD}/elections/${id}/schedule`}>
              <Button variant="secondary" size="sm" className="gap-2">
                <HiOutlinePencilSquare className="h-4 w-4" aria-hidden="true" />
                Edit schedule
              </Button>
            </Link>
          )}
        </div>
      </div>

      <ElectionReadOnlyView form={{ ...form, electionId: election.id }} />
    </div>
  );
}
