import { supabase } from '../supabase/supabase';
import { CANDIDATE_STORAGE_BUCKET } from '../utils/candidateConstants';
import {
  buildCandidatePhotoPath,
  extractCandidatePhotoStoragePath,
} from '../utils/candidateStorage';

export async function uploadCandidatePhoto(
  file,
  creatorId,
  candidateId,
  onProgress,
) {
  const path = buildCandidatePhotoPath(creatorId, candidateId, file.name);

  onProgress?.(15);

  const { error } = await supabase.storage
    .from(CANDIDATE_STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  onProgress?.(85);

  const { data } = supabase.storage
    .from(CANDIDATE_STORAGE_BUCKET)
    .getPublicUrl(path);

  onProgress?.(100);

  return data.publicUrl;
}

export async function deleteCandidatePhotoByUrl(photoUrl) {
  const path = extractCandidatePhotoStoragePath(photoUrl);
  if (!path) return;

  const { error } = await supabase.storage
    .from(CANDIDATE_STORAGE_BUCKET)
    .remove([path]);

  if (error) throw error;
}
