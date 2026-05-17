import { supabase } from '../supabase/supabase';
import { logAudit } from './auditLogService';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../utils/auditConstants';
import {
  deleteCandidatePhotoByUrl,
  uploadCandidatePhoto,
} from './candidateStorageService';

function mapCandidate(row) {
  if (!row) return null;
  const election = row.elections ?? row.election;
  return {
    ...row,
    election_title: election?.title ?? row.election_title ?? 'Unknown election',
    election_status: election?.status ?? row.election_status,
    election_category: election?.category ?? row.election_category,
  };
}

export async function fetchCandidatesByCreator(creatorId) {
  const { data, error } = await supabase
    .from('candidates')
    .select(
      `
      *,
      elections!inner (
        id,
        title,
        status,
        category,
        creator_id
      )
    `,
    )
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { elections, ...candidate } = row;
    return mapCandidate({ ...candidate, elections });
  });
}

export async function fetchCandidateStats(creatorId) {
  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('id, election_id')
    .eq('creator_id', creatorId);

  if (candidatesError) throw candidatesError;

  const { data: elections, error: electionsError } = await supabase
    .from('elections')
    .select('id')
    .eq('creator_id', creatorId);

  if (electionsError) throw electionsError;

  const uniqueElectionIds = new Set(
    (candidates ?? []).map((c) => c.election_id),
  );

  return {
    totalCandidates: candidates?.length ?? 0,
    totalElections: elections?.length ?? 0,
    electionsWithCandidates: uniqueElectionIds.size,
    averagePerElection:
      uniqueElectionIds.size > 0
        ? Math.round(
            ((candidates?.length ?? 0) / uniqueElectionIds.size) * 10,
          ) / 10
        : 0,
  };
}

export async function fetchCandidateById(candidateId, creatorId) {
  const { data, error } = await supabase
    .from('candidates')
    .select(
      `
      *,
      elections!inner (
        id,
        title,
        description,
        status,
        category,
        start_datetime,
        end_datetime,
        registration_deadline,
        creator_id
      )
    `,
    )
    .eq('id', candidateId)
    .eq('creator_id', creatorId)
    .single();

  if (error) throw error;

  const { elections, ...candidate } = data;
  return mapCandidate({ ...candidate, elections });
}

export async function createCandidate(creatorId, form, photoFile, onProgress) {
  const candidateId = crypto.randomUUID();

  const photoUrl = await uploadCandidatePhoto(
    photoFile,
    creatorId,
    candidateId,
    onProgress,
  );

  const { data, error } = await supabase
    .from('candidates')
    .insert({
      id: candidateId,
      election_id: form.election_id,
      creator_id: creatorId,
      name: form.name.trim(),
      designation: form.designation.trim(),
      manifesto: form.manifesto.trim(),
      photo_url: photoUrl,
    })
    .select(
      `
      *,
      elections ( id, title, status, category )
    `,
    )
    .single();

  if (error) {
    await deleteCandidatePhotoByUrl(photoUrl).catch(() => {});
    throw error;
  }

  const { elections, ...candidate } = data;
  await logAudit({
    actionType: AUDIT_ACTIONS.CANDIDATE_ADDED,
    moduleName: AUDIT_MODULES.CANDIDATE,
    description: `Candidate added: ${form.name}`,
    electionId: form.election_id,
    userId: creatorId,
  }).catch(() => {});
  return mapCandidate({ ...candidate, elections });
}

export async function updateCandidate(
  candidateId,
  creatorId,
  form,
  { photoFile, existingPhotoUrl, onProgress } = {},
) {
  let photoUrl = existingPhotoUrl;

  if (photoFile) {
    if (existingPhotoUrl) {
      await deleteCandidatePhotoByUrl(existingPhotoUrl).catch(() => {});
    }
    photoUrl = await uploadCandidatePhoto(
      photoFile,
      creatorId,
      candidateId,
      onProgress,
    );
  }

  const { data, error } = await supabase
    .from('candidates')
    .update({
      election_id: form.election_id,
      name: form.name.trim(),
      designation: form.designation.trim(),
      manifesto: form.manifesto.trim(),
      photo_url: photoUrl,
    })
    .eq('id', candidateId)
    .eq('creator_id', creatorId)
    .select(
      `
      *,
      elections ( id, title, status, category )
    `,
    )
    .single();

  if (error) throw error;

  const { elections, ...candidate } = data;
  await logAudit({
    actionType: AUDIT_ACTIONS.CANDIDATE_EDITED,
    moduleName: AUDIT_MODULES.CANDIDATE,
    description: `Candidate updated: ${form.name}`,
    electionId: form.election_id,
    userId: creatorId,
  }).catch(() => {});
  return mapCandidate({ ...candidate, elections });
}

export async function deleteCandidate(candidateId, creatorId) {
  const existing = await fetchCandidateById(candidateId, creatorId);

  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', candidateId)
    .eq('creator_id', creatorId);

  if (error) throw error;

  await logAudit({
    actionType: AUDIT_ACTIONS.CANDIDATE_DELETED,
    moduleName: AUDIT_MODULES.CANDIDATE,
    description: `Candidate deleted: ${existing?.name ?? candidateId}`,
    electionId: existing?.election_id,
    userId: creatorId,
  }).catch(() => {});

  if (existing?.photo_url) {
    await deleteCandidatePhotoByUrl(existing.photo_url).catch(() => {});
  }
}
