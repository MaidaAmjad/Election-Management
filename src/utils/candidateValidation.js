import {
  CANDIDATE_ALLOWED_EXTENSIONS,
  CANDIDATE_ALLOWED_IMAGE_TYPES,
  CANDIDATE_MAX_IMAGE_BYTES,
} from './candidateConstants';

export function validateCandidateForm(form, { requirePhoto, photoFile } = {}) {
  const errors = {};

  if (!form.poll_id?.trim()) {
    errors.poll_id = 'Poll is required.';
  }

  const name = form.name?.trim() ?? '';
  if (!name) {
    errors.name = 'Candidate name is required.';
  } else if (name.length < 3) {
    errors.name = 'Name must be at least 3 characters.';
  }

  if (!form.designation?.trim()) {
    errors.designation = 'Designation is required.';
  }

  const manifesto = form.manifesto?.trim() ?? '';
  if (!manifesto) {
    errors.manifesto = 'Manifesto / description is required.';
  } else if (manifesto.length < 20) {
    errors.manifesto = 'Description must be at least 20 characters.';
  }

  if (requirePhoto && !photoFile) {
    errors.photo = 'Candidate photo is required.';
  }

  if (photoFile) {
    const photoError = validateCandidateImageFile(photoFile);
    if (photoError) errors.photo = photoError;
  }

  return errors;
}

export function validateCandidateImageFile(file) {
  if (!file) return null;

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const typeOk =
    CANDIDATE_ALLOWED_IMAGE_TYPES.includes(file.type) ||
    CANDIDATE_ALLOWED_EXTENSIONS.includes(extension);

  if (!typeOk) {
    return 'Only JPG, JPEG, PNG, or WEBP images are allowed.';
  }

  if (file.size > CANDIDATE_MAX_IMAGE_BYTES) {
    return 'Image must be 5MB or smaller.';
  }

  return null;
}

export function hasCandidateValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}
