import { useEffect, useRef, useState } from 'react';
import { HiOutlinePhoto, HiOutlineXMark } from 'react-icons/hi2';
import { validateCandidateImageFile } from '../../utils/candidateValidation';

export default function CandidatePhotoUpload({
  file,
  onFileChange,
  existingUrl,
  error,
  disabled,
  uploadProgress,
  uploading,
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(existingUrl ?? null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(existingUrl ?? null);
    return undefined;
  }, [file, existingUrl]);

  function handleSelect(selected) {
    if (!selected) return;
    const validationError = validateCandidateImageFile(selected);
    if (validationError) {
      onFileChange(null, validationError);
      return;
    }
    onFileChange(selected, null);
  }

  function clearPhoto() {
    onFileChange(null, null);
    if (inputRef.current) inputRef.current.value = '';
    setPreviewUrl(existingUrl && !file ? existingUrl : null);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Candidate photo
      </label>

      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Candidate preview"
            className="h-40 w-40 rounded-xl border border-slate-200 object-cover shadow-sm"
          />
          {!disabled && (
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -right-2 -top-2 rounded-full bg-slate-900 p-1 text-white shadow hover:bg-slate-700"
              aria-label="Remove photo"
            >
              <HiOutlineXMark className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-full max-w-sm flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500 transition-colors hover:border-primary-400 hover:bg-primary-50/50 hover:text-primary-700 disabled:opacity-50"
        >
          <HiOutlinePhoto className="h-10 w-10" aria-hidden="true" />
          <span className="mt-2 text-sm font-medium">Upload photo</span>
          <span className="mt-1 text-xs">JPG, PNG, WEBP — max 5MB</span>
        </button>
      )}

      {previewUrl && !disabled && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Replace image
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
      />

      {uploading && (
        <div className="max-w-sm space-y-1">
          <div className="flex justify-between text-xs text-slate-600">
            <span>Uploading…</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
