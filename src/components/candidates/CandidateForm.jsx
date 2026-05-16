import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import CandidatePhotoUpload from './CandidatePhotoUpload';

export default function CandidateForm({
  form,
  onChange,
  elections,
  electionsLoading,
  photoFile,
  onPhotoChange,
  existingPhotoUrl,
  errors,
  submitting,
  uploadProgress,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      <Select
        id="candidate-election"
        label="Select election"
        value={form.election_id}
        onChange={(e) => onChange('election_id', e.target.value)}
        error={errors.election_id}
        disabled={submitting || electionsLoading}
      >
        <option value="">
          {electionsLoading ? 'Loading elections…' : 'Choose an election'}
        </option>
        {elections.map((election) => (
          <option key={election.id} value={election.id}>
            {election.title} ({election.status})
          </option>
        ))}
      </Select>

      <Input
        id="candidate-name"
        label="Candidate name"
        value={form.name}
        onChange={(e) => onChange('name', e.target.value)}
        error={errors.name}
        disabled={submitting}
        placeholder="Full name"
      />

      <Input
        id="candidate-designation"
        label="Designation"
        value={form.designation}
        onChange={(e) => onChange('designation', e.target.value)}
        error={errors.designation}
        disabled={submitting}
        placeholder="e.g. President, Secretary"
      />

      <Textarea
        id="candidate-manifesto"
        label="Manifesto / description"
        value={form.manifesto}
        onChange={(e) => onChange('manifesto', e.target.value)}
        error={errors.manifesto}
        disabled={submitting}
        rows={5}
        placeholder="Minimum 20 characters"
      />

      <CandidatePhotoUpload
        file={photoFile}
        onFileChange={onPhotoChange}
        existingUrl={existingPhotoUrl}
        error={errors.photo}
        disabled={submitting}
        uploadProgress={uploadProgress}
        uploading={submitting && uploadProgress > 0 && uploadProgress < 100}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting} isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
