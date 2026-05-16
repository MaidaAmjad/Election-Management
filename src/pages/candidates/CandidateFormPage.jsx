import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Spinner from '../../components/ui/Spinner';
import CandidateForm from '../../components/candidates/CandidateForm';
import { useAuth } from '../../hooks/useAuth';
import { useCreatorElections } from '../../hooks/useCreatorElections';
import {
  createCandidate,
  fetchCandidateById,
  updateCandidate,
} from '../../services/candidateService';
import { EMPTY_CANDIDATE_FORM } from '../../utils/candidateConstants';
import {
  hasCandidateValidationErrors,
  validateCandidateForm,
} from '../../utils/candidateValidation';
import { ROUTES } from '../../utils/constants';

export default function CandidateFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { elections, loading: electionsLoading } = useCreatorElections(user?.id);

  const [form, setForm] = useState(EMPTY_CANDIDATE_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingCandidate, setLoadingCandidate] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !user?.id) return;

    let cancelled = false;

    async function load() {
      setLoadingCandidate(true);
      try {
        const data = await fetchCandidateById(id, user.id);
        if (cancelled) return;
        setForm({
          election_id: data.election_id,
          name: data.name,
          designation: data.designation,
          manifesto: data.manifesto,
        });
        setExistingPhotoUrl(data.photo_url);
      } catch (err) {
        toast.error(err.message ?? 'Candidate not found.');
        navigate(ROUTES.CREATOR_CANDIDATES, { replace: true });
      } finally {
        if (!cancelled) setLoadingCandidate(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit, user?.id, navigate]);

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handlePhotoChange(file, error) {
    setPhotoFile(file);
    setPhotoError(error);
    setErrors((prev) => ({ ...prev, photo: error ?? undefined }));
  }

  async function handleSubmit() {
    const validationErrors = validateCandidateForm(form, {
      requirePhoto: !isEdit && !existingPhotoUrl,
      photoFile,
    });

    if (photoError) validationErrors.photo = photoError;
    if (!photoFile && !existingPhotoUrl) {
      validationErrors.photo = 'Candidate photo is required.';
    }

    setErrors(validationErrors);
    if (hasCandidateValidationErrors(validationErrors)) return;

    setSubmitting(true);
    setUploadProgress(0);

    try {
      if (isEdit) {
        await updateCandidate(id, user.id, form, {
          photoFile,
          existingPhotoUrl,
          onProgress: setUploadProgress,
        });
        toast.success('Candidate updated successfully.');
        navigate(`${ROUTES.CREATOR_CANDIDATES}/${id}`);
      } else {
        const created = await createCandidate(
          user.id,
          form,
          photoFile,
          setUploadProgress,
        );
        toast.success('Candidate added successfully.');
        navigate(`${ROUTES.CREATOR_CANDIDATES}/${created.id}`);
      }
    } catch (err) {
      toast.error(err.message ?? 'Failed to save candidate.');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }

  if (loadingCandidate) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to={isEdit ? `${ROUTES.CREATOR_CANDIDATES}/${id}` : ROUTES.CREATOR_CANDIDATES}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          ← Back
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">
          {isEdit ? 'Edit candidate' : 'Add candidate'}
        </h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <CandidateForm
          form={form}
          onChange={handleChange}
          elections={elections}
          electionsLoading={electionsLoading}
          photoFile={photoFile}
          onPhotoChange={handlePhotoChange}
          existingPhotoUrl={existingPhotoUrl}
          errors={errors}
          submitting={submitting}
          uploadProgress={uploadProgress}
          submitLabel={isEdit ? 'Save changes' : 'Add candidate'}
          onSubmit={handleSubmit}
          onCancel={() =>
            navigate(
              isEdit ? `${ROUTES.CREATOR_CANDIDATES}/${id}` : ROUTES.CREATOR_CANDIDATES,
            )
          }
        />
      </div>
    </div>
  );
}
