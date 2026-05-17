import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import CandidatePhotoUpload from '../candidates/CandidatePhotoUpload';
import {
  createCandidate,
  deleteCandidate,
  updateCandidate,
} from '../../services/candidateService';
import {
  hasCandidateValidationErrors,
  validateCandidateForm,
} from '../../utils/candidateValidation';

const emptyFields = () => ({
  name: '',
  designation: '',
  manifesto: '',
});

export default function PollCandidateEditor({
  poll,
  electionId,
  creatorId,
  candidates,
  onCandidatesChange,
  readOnly = false,
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fields, setFields] = useState(emptyFields());
  const [photoFile, setPhotoFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState(null);

  function resetFields() {
    setFields(emptyFields());
    setPhotoFile(null);
    setErrors({});
    setUploadProgress(0);
  }

  function resetForm() {
    setAdding(false);
    setEditingId(null);
    resetFields();
  }

  function startAddAnother() {
    setEditingId(null);
    resetFields();
    setAdding(true);
  }

  useEffect(() => {
    if (readOnly || editingId) return;
    if (candidates.length === 0) {
      setAdding(true);
    }
  }, [readOnly, candidates.length, editingId]);

  function startEdit(candidate) {
    setAdding(false);
    setEditingId(candidate.id);
    setFields({
      name: candidate.name,
      designation: candidate.designation,
      manifesto: candidate.manifesto,
    });
    setPhotoFile(null);
    setErrors({});
  }

  async function handleSave() {
    const form = {
      poll_id: poll.id,
      election_id: electionId,
      ...fields,
    };
    const validationErrors = validateCandidateForm(form, {
      requirePhoto: !editingId,
      photoFile,
    });
    setErrors(validationErrors);
    if (hasCandidateValidationErrors(validationErrors)) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const existing = candidates.find((c) => c.id === editingId);
        const updated = await updateCandidate(
          editingId,
          creatorId,
          form,
          {
            photoFile,
            existingPhotoUrl: existing?.photo_url,
            onProgress: setUploadProgress,
          },
        );
        onCandidatesChange(
          candidates.map((c) => (c.id === editingId ? updated : c)),
        );
        toast.success('Candidate updated.');
        resetForm();
      } else {
        const created = await createCandidate(creatorId, form, photoFile, setUploadProgress);
        onCandidatesChange([...candidates, created]);
        resetFields();
        setEditingId(null);
        setAdding(true);
        toast.success('Candidate added. You can add another below.');
      }
    } catch (err) {
      toast.error(err.message ?? 'Failed to save candidate.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(candidateId) {
    if (!window.confirm('Remove this candidate?')) return;
    setDeletingId(candidateId);
    try {
      await deleteCandidate(candidateId, creatorId);
      onCandidatesChange(candidates.filter((c) => c.id !== candidateId));
      toast.success('Candidate removed.');
      if (editingId === candidateId) resetForm();
    } catch (err) {
      toast.error(err.message ?? 'Failed to delete candidate.');
    } finally {
      setDeletingId(null);
    }
  }

  const showForm = adding || editingId;
  const addLabel =
    candidates.length === 0 ? 'Add candidate' : 'Add another candidate';

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {candidates.length === 0
              ? 'Add at least one candidate. You can register as many as you need.'
              : `${candidates.length} candidate${candidates.length === 1 ? '' : 's'} registered.`}
          </p>
          {!showForm && (
            <Button type="button" size="sm" className="shrink-0 gap-2" onClick={startAddAnother}>
              <HiOutlinePlus className="h-4 w-4" aria-hidden="true" />
              {addLabel}
            </Button>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {candidates.length === 0 && !showForm && (
          <li className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            No candidates yet. Use &quot;{addLabel}&quot; above to get started.
          </li>
        )}
        {candidates.map((candidate) => (
          <li
            key={candidate.id}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
          >
            <img
              src={candidate.photo_url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{candidate.name}</p>
              <p className="text-xs text-slate-500">{candidate.designation}</p>
            </div>
            {!readOnly && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(candidate)}
                  className="rounded p-2 text-slate-500 hover:bg-slate-100"
                  title="Edit"
                >
                  <HiOutlinePencilSquare className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(candidate.id)}
                  disabled={deletingId === candidate.id}
                  className="rounded p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Delete"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {showForm && !readOnly && (
        <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-800">
            {editingId ? 'Edit candidate' : 'New candidate'}
          </p>
          <Input
            label="Candidate name"
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
            error={errors.name}
            disabled={submitting}
          />
          <Input
            label="Designation"
            value={fields.designation}
            onChange={(e) => setFields((f) => ({ ...f, designation: e.target.value }))}
            error={errors.designation}
            disabled={submitting}
          />
          <Textarea
            label="Manifesto / description"
            value={fields.manifesto}
            onChange={(e) => setFields((f) => ({ ...f, manifesto: e.target.value }))}
            error={errors.manifesto}
            disabled={submitting}
            rows={4}
          />
          <CandidatePhotoUpload
            file={photoFile}
            onFileChange={(file, err) => {
              setPhotoFile(file);
              if (err) setErrors((prev) => ({ ...prev, photo: err }));
              else if (errors.photo) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.photo;
                  return next;
                });
              }
            }}
            existingUrl={
              editingId
                ? candidates.find((c) => c.id === editingId)?.photo_url
                : null
            }
            error={errors.photo}
            disabled={submitting}
            uploadProgress={uploadProgress}
            uploading={submitting && uploadProgress > 0}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleSave} isLoading={submitting}>
              {editingId ? 'Save changes' : 'Save candidate'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm} disabled={submitting}>
              {candidates.length === 0 ? 'Cancel' : 'Done adding'}
            </Button>
          </div>
        </div>
      )}

      {!readOnly && !showForm && candidates.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={startAddAnother}
        >
          <HiOutlinePlus className="h-4 w-4" aria-hidden="true" />
          Add another candidate
        </Button>
      )}
    </div>
  );
}
