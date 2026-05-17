import { supabase } from '../supabase/supabase';
import { logAudit } from './auditLogService';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../utils/auditConstants';
import { ELECTION_STATUS } from '../utils/electionConstants';
import { fromDatetimeLocalValue } from '../utils/electionValidation';
import { getEffectiveStatus } from '../utils/electionStatus';
import { loadPollsWithCandidates } from '../utils/pollCandidatesLoader';

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

async function syncPolls(electionId, polls) {
  const { data: existingPolls, error: fetchError } = await supabase
    .from('polls')
    .select('id')
    .eq('election_id', electionId);

  if (fetchError) throw fetchError;

  const existingIds = new Set((existingPolls ?? []).map((p) => p.id));
  const incomingIds = new Set(
    polls.filter((p) => !p.isNew && p.id).map((p) => p.id),
  );

  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('polls')
      .delete()
      .in('id', toDelete);
    if (deleteError) throw deleteError;
  }

  for (const poll of polls) {
    if (!poll.title?.trim()) continue;

    const pollPayload = {
      election_id: electionId,
      title: poll.title.trim(),
      description: poll.description?.trim() ?? '',
    };

    if (poll.isNew || !existingIds.has(poll.id)) {
      const { error: insertError } = await supabase
        .from('polls')
        .insert(pollPayload);
      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await supabase
        .from('polls')
        .update({
          title: pollPayload.title,
          description: pollPayload.description,
        })
        .eq('id', poll.id);
      if (updateError) throw updateError;
    }
  }

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
      description: 'Primary ballot — assign additional polls in the next step.',
    })
    .select()
    .single();

  if (error) throw error;
  return { ...data, candidates: [] };
}

async function copyStagingCandidatesToEmptyPolls(election, creatorId) {
  const polls = election.polls ?? [];
  const templates = polls[0]?.candidates ?? [];
  if (!templates.length) return;

  for (const poll of polls.slice(1)) {
    if (poll.candidates?.length) continue;
    const rows = templates.map((template) => ({
      id: crypto.randomUUID(),
      election_id: election.id,
      poll_id: poll.id,
      creator_id: creatorId,
      name: template.name?.trim() ?? '',
      designation: template.designation?.trim() ?? '',
      manifesto: template.manifesto?.trim() ?? '',
      photo_url: template.photo_url || null,
    }));
    const { error } = await supabase.from('candidates').insert(rows);
    if (error) throw error;
  }
}

export async function assertElectionReadyToPublish(electionId, creatorId) {
  let election = await fetchElectionById(electionId, creatorId);
  let polls = election.polls ?? [];

  if (!polls.length) {
    throw new Error('Add at least one poll before publishing.');
  }

  if (polls.length > 1 && polls[0]?.candidates?.length) {
    await copyStagingCandidatesToEmptyPolls(election, creatorId);
    election = await fetchElectionById(electionId, creatorId);
    polls = election.polls ?? [];
  }

  if (!(polls[0]?.candidates?.length)) {
    throw new Error('Add at least one candidate before publishing.');
  }

  for (const poll of polls) {
    if (!poll.title?.trim()) {
      throw new Error('Every poll must have a title before publishing.');
    }
    if (!poll.candidates?.length) {
      throw new Error(
        `Add at least one candidate to the poll "${poll.title}" before publishing.`,
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
  await logAudit({
    actionType: AUDIT_ACTIONS.ELECTION_CREATED,
    moduleName: AUDIT_MODULES.ELECTION,
    description: `Draft election created: ${form.title}`,
    electionId: data.id,
    userId: creatorId,
  }).catch(() => {});
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
  await logAudit({
    actionType: AUDIT_ACTIONS.ELECTION_UPDATED,
    moduleName: AUDIT_MODULES.ELECTION,
    description: `Election draft updated: ${form.title}`,
    electionId,
    userId: creatorId,
  }).catch(() => {});
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

  await logAudit({
    actionType: AUDIT_ACTIONS.ELECTION_DELETED,
    moduleName: AUDIT_MODULES.ELECTION,
    description: `Draft election deleted`,
    electionId,
    userId: creatorId,
  }).catch(() => {});
}
