import { supabase } from '../supabase/supabase';
import { notifyPendingSecretIdEmails } from './notificationService';
import { ELECTION_STATUS } from '../utils/electionConstants';
import { fromDatetimeLocalValue } from '../utils/electionValidation';
import { getEffectiveStatus } from '../utils/electionStatus';
import {
  getDisplayPolls,
  getStagingPoll,
  loadPollsWithCandidates,
} from '../utils/pollCandidatesLoader';

function mapElectionRow(row, polls = []) {
  if (!row) return null;
  const election = { ...row, polls };
  return {
    ...election,
    effectiveStatus: getEffectiveStatus(election),
  };
}

export async function fetchElectionsByCreator(creatorId) {
  const { data, error } = await supabase
    .from('elections')
    .select('*, polls(*)')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const { polls, ...election } = row;
    return mapElectionRow(election, polls ?? []);
  });
}

export async function fetchElectionById(electionId, creatorId) {
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', electionId)
    .eq('creator_id', creatorId)
    .single();

  if (error) throw error;

  const pollsWithCandidates = await loadPollsWithCandidates(electionId);
  return mapElectionRow(data, pollsWithCandidates);
}

function buildElectionPayload(form, creatorId, status) {
  return {
    creator_id: creatorId,
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    start_datetime: fromDatetimeLocalValue(form.start_datetime),
    end_datetime: fromDatetimeLocalValue(form.end_datetime),
    registration_deadline: fromDatetimeLocalValue(form.registration_deadline),
    max_voters: Number(form.max_voters),
    status,
  };
}

async function syncPollOptions(polls, idMap) {
  const realPolls = getDisplayPolls(polls).filter((p) => p.title?.trim());

  for (const poll of realPolls) {
    const pollId = idMap.get(poll.id) ?? poll.id;
    const optionIds = poll.optionCandidateIds ?? [];

    const { error: deleteError } = await supabase
      .from('poll_options')
      .delete()
      .eq('poll_id', pollId);

    if (deleteError) {
      if (deleteError.code !== '42P01' && !deleteError.message?.includes('poll_options')) {
        throw deleteError;
      }
      continue;
    }

    if (optionIds.length === 0) continue;

    const rows = optionIds.map((candidateId) => ({
      poll_id: pollId,
      candidate_id: candidateId,
    }));

    const { error: insertError } = await supabase.from('poll_options').insert(rows);
    if (insertError) throw insertError;
  }
}

async function syncPolls(electionId, polls) {
  const { data: existingPolls, error: fetchError } = await supabase
    .from('polls')
    .select('id, is_staging, title, description')
    .eq('election_id', electionId);

  if (fetchError) throw fetchError;

  const stagingPoll =
    (existingPolls ?? []).find((p) => p.is_staging) ??
    (existingPolls ?? []).find(
      (p) =>
        p.title === 'Ballot 1' &&
        (p.description ?? '').toLowerCase().includes('ballot'),
    );
  const stagingId = stagingPoll?.id;

  const existingIds = new Set((existingPolls ?? []).map((p) => p.id));
  const incomingIds = new Set(
    polls.filter((p) => p.id && (!p.isNew || existingIds.has(p.id))).map((p) => p.id),
  );

  if (stagingId) incomingIds.add(stagingId);

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id) && id !== stagingId);
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from('polls').delete().in('id', toDelete);
    if (deleteError) throw deleteError;
  }

  const idMap = new Map();

  for (const poll of polls) {
    if (poll.isStaging || poll.is_staging) {
      if (poll.id) idMap.set(poll.id, poll.id);
      continue;
    }
    if (
      stagingId &&
      poll.id === stagingId &&
      poll.title === 'Ballot 1' &&
      !(poll.optionCandidateIds?.length)
    ) {
      idMap.set(poll.id, poll.id);
      continue;
    }
    if (!poll.title?.trim()) continue;

    const pollPayload = {
      election_id: electionId,
      title: poll.title.trim(),
      description: poll.description?.trim() ?? '',
      allow_multiple_answers: Boolean(poll.allowMultipleAnswers),
      is_staging: false,
    };

    if (poll.isNew && !existingIds.has(poll.id)) {
      const { data: inserted, error: insertError } = await supabase
        .from('polls')
        .insert(pollPayload)
        .select('id')
        .single();
      if (insertError) throw insertError;
      idMap.set(poll.id, inserted.id);
    } else {
      const { error: updateError } = await supabase
        .from('polls')
        .update({
          title: pollPayload.title,
          description: pollPayload.description,
          allow_multiple_answers: pollPayload.allow_multiple_answers,
        })
        .eq('id', poll.id);
      if (updateError) throw updateError;
      idMap.set(poll.id, poll.id);
    }
  }

  await syncPollOptions(polls, idMap);

  void notifyPendingSecretIdEmails(electionId).catch(() => {});

  return loadPollsWithCandidates(electionId);
}

/** Ensures a draft poll exists so candidates can be saved (step 2 before step 3). */
export async function ensureStagingPoll(electionId) {
  const polls = await loadPollsWithCandidates(electionId);
  if (polls.length > 0) {
    return polls[0];
  }

  const { data, error } = await supabase
    .from('polls')
    .insert({
      election_id: electionId,
      title: 'Ballot 1',
      description: 'Primary ballot — candidate pool for this election.',
      is_staging: true,
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, candidates: [], isStaging: true, is_staging: true };
}

export async function assertElectionReadyToPublish(electionId, creatorId) {
  const election = await fetchElectionById(electionId, creatorId);
  const polls = election.polls ?? [];
  const staging = getStagingPoll(polls);
  const displayPolls = getDisplayPolls(polls);

  if (!(staging?.candidates?.length)) {
    throw new Error('Add at least one candidate before publishing.');
  }

  if (!displayPolls.length) {
    throw new Error('Add at least one poll before publishing.');
  }

  for (const poll of displayPolls) {
    if (!poll.title?.trim()) {
      throw new Error('Every poll must have a question before publishing.');
    }
    const optionCount =
      poll.optionCandidateIds?.length ?? poll.candidates?.length ?? 0;
    if (optionCount < 2) {
      throw new Error(
        `Select at least two options for the poll "${poll.title}" before publishing.`,
      );
    }
  }

  return election;
}

export async function createElectionDraft(creatorId, form) {
  const { data, error } = await supabase
    .from('elections')
    .insert(buildElectionPayload(form, creatorId, ELECTION_STATUS.DRAFT))
    .select()
    .single();

  if (error) throw error;

  await syncPolls(data.id, form.polls ?? []);
  return fetchElectionById(data.id, creatorId);
}

export async function updateElectionDraft(electionId, creatorId, form) {
  const { error } = await supabase
    .from('elections')
    .update(buildElectionPayload(form, creatorId, ELECTION_STATUS.DRAFT))
    .eq('id', electionId)
    .eq('creator_id', creatorId)
    .eq('status', ELECTION_STATUS.DRAFT);

  if (error) throw error;

  await syncPolls(electionId, form.polls ?? []);
  return fetchElectionById(electionId, creatorId);
}

/** @deprecated Use submitElectionForApproval from electionApprovalService */
export async function publishElection(electionId, creatorId, form) {
  const { submitElectionForApproval } = await import('./electionApprovalService');
  await syncPolls(electionId, form.polls ?? []);
  await supabase
    .from('elections')
    .update(buildElectionPayload(form, creatorId, ELECTION_STATUS.DRAFT))
    .eq('id', electionId)
    .eq('creator_id', creatorId)
    .eq('status', ELECTION_STATUS.DRAFT);
  await submitElectionForApproval(electionId, creatorId);
  return fetchElectionById(electionId, creatorId);
}

export async function deleteElectionDraft(electionId, creatorId) {
  const { error } = await supabase
    .from('elections')
    .delete()
    .eq('id', electionId)
    .eq('creator_id', creatorId)
    .eq('status', ELECTION_STATUS.DRAFT);

  if (error) throw error;
}
