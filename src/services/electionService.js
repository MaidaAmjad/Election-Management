import { supabase } from '../supabase/supabase';
import { logAudit } from './auditLogService';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../utils/auditConstants';
import { ELECTION_STATUS } from '../utils/electionConstants';
import { fromDatetimeLocalValue } from '../utils/electionValidation';
import { getEffectiveStatus } from '../utils/electionStatus';

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
    .select('*, polls(*)')
    .eq('id', electionId)
    .eq('creator_id', creatorId)
    .single();

  if (error) throw error;

  const { polls, ...election } = data;
  return mapElectionRow(election, polls ?? []);
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

export async function publishElection(electionId, creatorId, form) {
  const { error } = await supabase
    .from('elections')
    .update(buildElectionPayload(form, creatorId, ELECTION_STATUS.PUBLISHED))
    .eq('id', electionId)
    .eq('creator_id', creatorId)
    .eq('status', ELECTION_STATUS.DRAFT);

  if (error) throw error;

  await syncPolls(electionId, form.polls ?? []);
  await logAudit({
    actionType: AUDIT_ACTIONS.ELECTION_PUBLISHED,
    moduleName: AUDIT_MODULES.ELECTION,
    description: `Election published: ${form.title}`,
    electionId,
    userId: creatorId,
  }).catch(() => {});

  const { scheduleElectionEmailReminders } = await import('./notificationService');
  await scheduleElectionEmailReminders(electionId).catch(() => {});

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
