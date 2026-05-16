import { CANDIDATE_STORAGE_BUCKET } from './candidateConstants';

export function buildCandidatePhotoPath(creatorId, candidateId, fileName) {
  const extension =
    fileName.split('.').pop()?.toLowerCase().replace('jpeg', 'jpg') ?? 'jpg';
  const safeExt = ['jpg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
  return `${creatorId}/${candidateId}/photo.${safeExt}`;
}

export function extractCandidatePhotoStoragePath(photoUrl) {
  if (!photoUrl) return null;

  const marker = `/storage/v1/object/public/${CANDIDATE_STORAGE_BUCKET}/`;
  const index = photoUrl.indexOf(marker);
  if (index === -1) return null;

  return decodeURIComponent(photoUrl.slice(index + marker.length));
}
