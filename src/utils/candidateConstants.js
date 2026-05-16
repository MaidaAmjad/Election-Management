export const CANDIDATE_STORAGE_BUCKET = 'candidate-images';

export const CANDIDATE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const CANDIDATE_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const CANDIDATE_ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export const CANDIDATE_PAGE_SIZE = 6;

export const CANDIDATE_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export const EMPTY_CANDIDATE_FORM = {
  election_id: '',
  name: '',
  designation: '',
  manifesto: '',
};
