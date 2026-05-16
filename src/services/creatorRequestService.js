import { supabase } from '../supabase/supabase';
import { USER_ROLES } from '../utils/constants';
import {
  CREATOR_REQUEST_STATUS,
  ACTIVITY_ACTIONS,
} from '../utils/adminConstants';
import { logActivity } from './activityLogService';
import {
  sendCreatorApprovedEmail,
  sendCreatorRejectedEmail,
} from './notificationService';
import { updateProfileRole } from './profileService';

async function attachProfiles(requests) {
  if (!requests?.length) return [];

  const userIds = [...new Set(requests.map((r) => r.user_id))];
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, created_at')
    .in('id', userIds);

  if (error) throw error;

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  return requests.map((row) =>
    mapRequestRow({ ...row, profiles: profileMap[row.user_id] }),
  );
}

function mapRequestRow(row) {
  if (!row) return null;
  const profile = row.profiles ?? null;
  return {
    id: row.id,
    user_id: row.user_id,
    purpose: row.purpose,
    email: row.email,
    phone: row.phone,
    organization: row.organization,
    status: row.status,
    rejection_reason: row.rejection_reason,
    created_at: row.created_at,
    creator_name: profile?.full_name ?? 'Unknown',
    profile_created_at: profile?.created_at ?? null,
  };
}

export async function createCreatorRequest({
  userId,
  purpose,
  email,
  phone,
  organization,
}) {
  const { data, error } = await supabase
    .from('creator_requests')
    .insert({
      user_id: userId,
      purpose: purpose.trim(),
      email: email.trim(),
      phone: phone.trim(),
      organization: organization.trim(),
      status: CREATOR_REQUEST_STATUS.PENDING,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logActivity({
    userId,
    action: ACTIVITY_ACTIONS.REQUEST_SUBMITTED,
    description: `Election creator request submitted for ${organization.trim()}.`,
  });

  const [mapped] = await attachProfiles([data]);
  return mapped;
}

export async function fetchLatestCreatorRequestByUserId(userId) {
  const { data, error } = await supabase
    .from('creator_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [mapped] = await attachProfiles([data]);
  return mapped;
}

export async function fetchAllCreatorRequests() {
  const { data, error } = await supabase
    .from('creator_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachProfiles(data ?? []);
}

export async function fetchCreatorRequestById(requestId) {
  const { data, error } = await supabase
    .from('creator_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error) throw error;
  const [mapped] = await attachProfiles([data]);
  return mapped;
}

export async function fetchCreatorRequestStats() {
  const requests = await fetchAllCreatorRequests();
  return {
    pending: requests.filter((r) => r.status === CREATOR_REQUEST_STATUS.PENDING)
      .length,
    approved: requests.filter(
      (r) => r.status === CREATOR_REQUEST_STATUS.APPROVED,
    ).length,
    rejected: requests.filter(
      (r) => r.status === CREATOR_REQUEST_STATUS.REJECTED,
    ).length,
    total: requests.length,
  };
}

export async function approveCreatorRequest(requestId, adminUserId) {
  const request = await fetchCreatorRequestById(requestId);

  if (request.status !== CREATOR_REQUEST_STATUS.PENDING) {
    throw new Error('Only pending requests can be approved.');
  }

  const { data, error } = await supabase
    .from('creator_requests')
    .update({ status: CREATOR_REQUEST_STATUS.APPROVED, rejection_reason: null })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw error;

  await updateProfileRole(request.user_id, USER_ROLES.ELECTION_CREATOR);

  await logActivity({
    userId: adminUserId,
    action: ACTIVITY_ACTIONS.REQUEST_APPROVED,
    description: `Approved election creator request ${requestId} for ${request.creator_name}.`,
  });

  try {
    await sendCreatorApprovedEmail({
      to: request.email,
      creatorName: request.creator_name,
    });
  } catch (emailError) {
    console.error('[Email] Approval notification failed:', emailError.message);
  }

  const [mapped] = await attachProfiles([data]);
  return mapped;
}

export async function rejectCreatorRequest(requestId, adminUserId, rejectionReason) {
  const request = await fetchCreatorRequestById(requestId);

  if (request.status !== CREATOR_REQUEST_STATUS.PENDING) {
    throw new Error('Only pending requests can be rejected.');
  }

  const reason = rejectionReason.trim();

  const { data, error } = await supabase
    .from('creator_requests')
    .update({
      status: CREATOR_REQUEST_STATUS.REJECTED,
      rejection_reason: reason,
    })
    .eq('id', requestId)
    .select('*')
    .single();

  if (error) throw error;

  await logActivity({
    userId: adminUserId,
    action: ACTIVITY_ACTIONS.REQUEST_REJECTED,
    description: `Rejected election creator request ${requestId} for ${request.creator_name}. Reason: ${reason}`,
  });

  try {
    await sendCreatorRejectedEmail({
      to: request.email,
      creatorName: request.creator_name,
      rejectionReason: reason,
    });
  } catch (emailError) {
    console.error('[Email] Rejection notification failed:', emailError.message);
  }

  const [mapped] = await attachProfiles([data]);
  return mapped;
}

export function isCreatorApproved(request) {
  return request?.status === CREATOR_REQUEST_STATUS.APPROVED;
}
