import { supabase } from '../supabase/supabase';
import { logAudit } from './auditLogService';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../utils/auditConstants';
import { ELECTION_APPROVAL_STATUS } from '../utils/electionApprovalConstants';
import {
  sendElectionApprovedEmail,
  sendElectionRejectedEmail,
  scheduleElectionEmailReminders,
} from './notificationService';
import { loadPollsWithCandidates } from '../utils/pollCandidatesLoader';

async function attachCreatorDetails(elections) {
  if (!elections?.length) return [];

  const creatorIds = [...new Set(elections.map((e) => e.creator_id))];

  const [{ data: profiles }, { data: requests }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone').in('id', creatorIds),
    supabase
      .from('creator_requests')
      .select('user_id, purpose, email, phone, organization, status')
      .in('user_id', creatorIds)
      .order('created_at', { ascending: false }),
  ]);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const requestMap = {};
  for (const row of requests ?? []) {
    if (!requestMap[row.user_id]) requestMap[row.user_id] = row;
  }

  return elections.map((election) => {
    const profile = profileMap[election.creator_id];
    const creatorRequest = requestMap[election.creator_id];
    return {
      ...election,
      creator_name: profile?.full_name ?? 'Unknown',
      creator_email: creatorRequest?.email ?? null,
      creator_phone: creatorRequest?.phone ?? profile?.phone ?? null,
      creator_organization: creatorRequest?.organization ?? null,
      creator_purpose: creatorRequest?.purpose ?? null,
    };
  });
}

export async function fetchElectionRequests({ status } = {}) {
  let query = supabase
    .from('elections')
    .select('*')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('approval_status', status);
  } else {
    query = query.not('approval_status', 'is', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return attachCreatorDetails(data ?? []);
}

export async function fetchPendingElectionRequests() {
  return fetchElectionRequests({ status: ELECTION_APPROVAL_STATUS.PENDING });
}

export async function fetchElectionRequestById(electionId) {
  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .eq('id', electionId)
    .single();

  if (error) throw error;

  const polls = await loadPollsWithCandidates(electionId);
  const [mapped] = await attachCreatorDetails([data]);
  return { ...mapped, polls };
}

export async function fetchElectionRequestStats() {
  const all = await fetchElectionRequests();
  return {
    pending: all.filter((e) => e.approval_status === ELECTION_APPROVAL_STATUS.PENDING)
      .length,
    approved: all.filter((e) => e.approval_status === ELECTION_APPROVAL_STATUS.APPROVED)
      .length,
    rejected: all.filter((e) => e.approval_status === ELECTION_APPROVAL_STATUS.REJECTED)
      .length,
    total: all.length,
  };
}

export async function submitElectionForApproval(electionId, creatorId) {
  const { data, error } = await supabase.rpc('submit_election_for_approval', {
    p_election_id: electionId,
  });

  if (error) throw error;
  if (data?.success === false) {
    throw new Error(data.message ?? 'Could not submit election for approval.');
  }

  await logAudit({
    userId: creatorId,
    actionType: AUDIT_ACTIONS.ELECTION_SUBMITTED,
    moduleName: AUDIT_MODULES.APPROVAL,
    description: `Election submitted for admin approval.`,
    electionId,
  }).catch(() => {});

  return data;
}

export async function approveElectionRequest(electionId, adminUserId) {
  const before = await fetchElectionRequestById(electionId);

  const { data, error } = await supabase.rpc('approve_election_request', {
    p_election_id: electionId,
  });

  if (error) throw error;
  if (data?.success === false) {
    throw new Error(data.message ?? 'Could not approve election.');
  }

  await scheduleElectionEmailReminders(electionId).catch(() => {});

  await logAudit({
    userId: adminUserId,
    actionType: AUDIT_ACTIONS.ELECTION_APPROVED,
    moduleName: AUDIT_MODULES.APPROVAL,
    description: `Approved election: ${before.title}`,
    electionId,
  }).catch(() => {});

  try {
    await sendElectionApprovedEmail({
      userId: before.creator_id,
      to: before.creator_email,
      creatorName: before.creator_name,
      electionTitle: before.title,
    });
  } catch (emailErr) {
    console.error('[Email] Election approval notify failed:', emailErr?.message);
  }

  return data;
}

export async function rejectElectionRequest(electionId, adminUserId, rejectionReason) {
  const before = await fetchElectionRequestById(electionId);
  const reason = rejectionReason.trim();

  const { data, error } = await supabase.rpc('reject_election_request', {
    p_election_id: electionId,
    p_rejection_reason: reason,
  });

  if (error) throw error;
  if (data?.success === false) {
    throw new Error(data.message ?? 'Could not reject election.');
  }

  await logAudit({
    userId: adminUserId,
    actionType: AUDIT_ACTIONS.ELECTION_REJECTED,
    moduleName: AUDIT_MODULES.APPROVAL,
    description: `Rejected election: ${before.title}. Reason: ${reason}`,
    electionId,
  }).catch(() => {});

  try {
    await sendElectionRejectedEmail({
      userId: before.creator_id,
      to: before.creator_email,
      creatorName: before.creator_name,
      electionTitle: before.title,
      rejectionReason: reason,
    });
  } catch (emailErr) {
    console.error('[Email] Election rejection notify failed:', emailErr?.message);
  }

  return data;
}
