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
  const poll = row.polls ?? row.poll;
  return {
    ...row,
    election_title: election?.title ?? row.election_title ?? 'Unknown election',
    election_status: election?.status ?? row.election_status,
    poll_title: poll?.title ?? row.poll_title,
  };
}

export async function fetchCandidatesByElection(electionId, creatorId) {
  const { data, error } = await supabase
    .from('candidates')
    .select(
      `
      *,
      elections!inner ( id, title, status, creator_id ),
      polls ( id, title )
    `,
    )
    .eq('election_id', electionId)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { elections, polls, ...candidate } = row;
    return mapCandidate({ ...candidate, elections, polls });
  });
}

export async function fetchCandidatesByPoll(pollId, creatorId) {
  const { data, error } = await supabase
    .from('candidates')
    .select(
      `
      *,
      elections!inner ( id, title, status, creator_id ),
      polls!inner ( id, title )
    `,
    )
    .eq('poll_id', pollId)
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { elections, polls, ...candidate } = row;
    return mapCandidate({ ...candidate, elections, polls });
  });
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
        status,
        creator_id
      ),
      polls!inner ( id, title )
    `,
    )
    .eq('id', candidateId)
    .eq('creator_id', creatorId)
    .single();

  if (error) throw error;

  const { elections, polls, ...candidate } = data;
  return mapCandidate({ ...candidate, elections, polls });
}

export async function createCandidate(
  creatorId,
  { election_id, poll_id, name, designation, manifesto },
  photoFile,
  onProgress,
) {
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
      election_id,
      poll_id,
      creator_id: creatorId,
      name: name.trim(),
      designation: designation.trim(),
      manifesto: manifesto.trim(),
      photo_url: photoUrl,
    })
    .select(
      `
      *,
      elections ( id, title, status ),
      polls ( id, title )
    `,
    )
    .single();

  if (error) {
    await deleteCandidatePhotoByUrl(photoUrl).catch(() => {});
    throw error;
  }

  const { elections, polls, ...candidate } = data;
  await logAudit({
    actionType: AUDIT_ACTIONS.CANDIDATE_ADDED,
    moduleName: AUDIT_MODULES.CANDIDATE,
    description: `Candidate added: ${name}`,
    electionId: election_id,
    userId: creatorId,
  }).catch(() => {});
  return mapCandidate({ ...candidate, elections, polls });
}

export async function updateCandidate(
  candidateId,
  creatorId,
  { election_id, poll_id, name, designation, manifesto },
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
      election_id,
      poll_id,
      name: name.trim(),
      designation: designation.trim(),
      manifesto: manifesto.trim(),
      photo_url: photoUrl,
    })
    .eq('id', candidateId)
    .eq('creator_id', creatorId)
    .select(
      `
      *,
      elections ( id, title, status ),
      polls ( id, title )
    `,
    )
    .single();

  if (error) throw error;

  const { elections, polls, ...candidate } = data;
  await logAudit({
    actionType: AUDIT_ACTIONS.CANDIDATE_EDITED,
    moduleName: AUDIT_MODULES.CANDIDATE,
    description: `Candidate updated: ${name}`,
    electionId: election_id,
    userId: creatorId,
  }).catch(() => {});
  return mapCandidate({ ...candidate, elections, polls });
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
