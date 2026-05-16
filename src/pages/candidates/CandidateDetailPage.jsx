import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HiOutlinePencilSquare } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import DeleteCandidateModal from '../../components/candidates/DeleteCandidateModal';
import { useAuth } from '../../hooks/useAuth';
import {
  deleteCandidate,
  fetchCandidateById,
} from '../../services/candidateService';
import { formatElectionDate } from '../../utils/electionFormatters';
import { ROUTES } from '../../utils/constants';

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id || !id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchCandidateById(id, user.id);
        if (!cancelled) setCandidate(data);
      } catch (err) {
        toast.error(err.message ?? 'Candidate not found.');
        if (!cancelled) navigate(ROUTES.CREATOR_CANDIDATES, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id, navigate]);

  async function handleDelete() {
    setDeleteSubmitting(true);
    try {
      await deleteCandidate(id, user.id);
      toast.success('Candidate deleted successfully.');
      navigate(`${ROUTES.CREATOR_CANDIDATES}/list`, { replace: true });
    } catch (err) {
      toast.error(err.message ?? 'Failed to delete candidate.');
    } finally {
      setDeleteSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to={`${ROUTES.CREATOR_CANDIDATES}/list`}
        className="text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        ← All candidates
      </Link>

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-primary-700 to-primary-900 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <img
              src={candidate.photo_url}
              alt={candidate.name}
              className="h-32 w-32 rounded-2xl border-4 border-white/20 object-cover shadow-lg"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold">{candidate.name}</h1>
              <p className="mt-1 text-lg text-primary-100">{candidate.designation}</p>
              <p className="mt-2 text-sm text-primary-200">
                Added {formatElectionDate(candidate.created_at)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-6 sm:p-8">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Manifesto</h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed text-slate-600">
              {candidate.manifesto}
            </p>
          </section>

          <section className="rounded-xl border border-slate-100 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Election</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Title</dt>
                <dd className="font-medium text-slate-900">{candidate.election_title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Category</dt>
                <dd className="text-slate-900">{candidate.election_category}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd className="text-slate-900">{candidate.election_status}</dd>
              </div>
            </dl>
          </section>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
            <Link to={`${ROUTES.CREATOR_CANDIDATES}/${id}/edit`}>
              <Button className="w-full gap-2 sm:w-auto">
                <HiOutlinePencilSquare className="h-4 w-4" />
                Edit candidate
              </Button>
            </Link>
            <Button
              variant="danger"
              className="w-full sm:w-auto"
              onClick={() => setDeleteOpen(true)}
            >
              Delete candidate
            </Button>
          </div>
        </div>
      </article>

      <DeleteCandidateModal
        open={deleteOpen}
        onClose={() => !deleteSubmitting && setDeleteOpen(false)}
        onConfirm={handleDelete}
        candidateName={candidate.name}
        submitting={deleteSubmitting}
      />
    </div>
  );
}
