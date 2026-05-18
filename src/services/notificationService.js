import { supabase } from '../supabase/supabase';
import { invokeEmailService } from './emailService';
import { USER_ROLES } from '../utils/constants';

function parseRpcRows(data) {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchMyNotifications({ limit = 20, offset = 0, unreadOnly = false } = {}) {
  const { data, error } = await supabase.rpc('get_my_notifications', {
    p_limit: limit,
    p_offset: offset,
    p_unread_only: unreadOnly,
  });
  if (error) throw error;
  return parseRpcRows(data);
}

export async function fetchUnreadCount() {
  const { data, error } = await supabase.rpc('get_unread_notification_count');
  if (error) throw error;
  return data ?? 0;
}

export async function markNotificationRead(notificationId) {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw error;
  return data ?? 0;
}

export async function deleteNotification(notificationId) {
  const { data, error } = await supabase.rpc('delete_notification', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
  return data;
}

export async function searchNotifications({
  search = '',
  type = 'all',
  readFilter = 'all',
  page = 1,
  pageSize = 20,
} = {}) {
  const { data, error } = await supabase.rpc('search_notifications', {
    p_search: search || null,
    p_type: type === 'all' ? null : type,
    p_read_filter: readFilter,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  return data ?? { success: false, rows: [], total: 0, page: 1 };
}

export function subscribeToNotifications(userId, onChange) {
  if (!userId) return () => {};

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange?.(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function sendSignupVerificationEmail({ email, userId, fullName }) {
  return invokeEmailService({
    action: 'signup_verification_send',
    email,
    userId,
    fullName,
  });
}

export async function verifySignupEmailToken(token) {
  return invokeEmailService({
    action: 'signup_verification_verify',
    token,
  });
}

export async function sendCreatorApprovedEmail({ userId, to, creatorName, role }) {
  return invokeEmailService({
    action: 'creator_approved_notify',
    userId,
    email: to,
    creatorName,
    role: role ?? USER_ROLES.ELECTION_CREATOR,
  });
}

export async function sendCreatorRejectedEmail({
  userId,
  to,
  creatorName,
  rejectionReason,
}) {
  return invokeEmailService({
    action: 'creator_rejected_notify',
    userId,
    email: to,
    creatorName,
    rejectionReason,
  });
}

export async function sendElectionApprovedEmail({
  userId,
  to,
  creatorName,
  electionTitle,
}) {
  return invokeEmailService({
    action: 'election_approved_notify',
    userId,
    email: to,
    creatorName,
    electionTitle,
  });
}

export async function sendElectionRejectedEmail({
  userId,
  to,
  creatorName,
  electionTitle,
  rejectionReason,
}) {
  return invokeEmailService({
    action: 'election_rejected_notify',
    userId,
    email: to,
    creatorName,
    electionTitle,
    rejectionReason,
  });
}

export async function sendSecretIdEmail({ secretRowId }) {
  return invokeEmailService({
    action: 'secret_id_send',
    secret_row_id: secretRowId,
  });
}

function normalizeSecretRowIds(secretRowIds) {
  if (!secretRowIds) return [];
  if (Array.isArray(secretRowIds)) {
    return secretRowIds.filter(Boolean);
  }
  if (typeof secretRowIds === 'string') {
    try {
      const parsed = JSON.parse(secretRowIds);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Email all secret IDs for the current voter after election registration. */
export async function sendSecretIdsOnRegistration({
  electionId,
  secretRowIds = null,
  secretIdsIssued = null,
}) {
  if (secretIdsIssued === 0) {
    return {
      success: true,
      sent: 0,
      message:
        'Registered successfully. Secret IDs will be emailed once the election has voting polls (after the creator finishes setup).',
    };
  }

  try {
    return await invokeEmailService({
      action: 'secret_id_registration_notify',
      election_id: electionId,
    });
  } catch (err) {
    const message = err?.message ?? '';
    if (!message.includes('Unknown action')) throw err;
    return sendSecretIdsOnRegistrationFallback({
      electionId,
      secretRowIds,
    });
  }
}

/** Works with older send-email deployments (before secret_id_registration_notify). */
async function sendSecretIdsOnRegistrationFallback({ electionId, secretRowIds }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Authentication required');

  const fromRegistration = normalizeSecretRowIds(secretRowIds);
  let rowIds = fromRegistration;

  if (!rowIds.length) {
    const { data: issued, error: issueError } = await supabase.rpc(
      'issue_secret_ids_for_voter',
      { p_election_id: electionId, p_voter_id: user.id },
    );
    if (issueError) throw issueError;
    if (issued?.success === false) {
      throw new Error(
        issued?.message ??
          'Could not create Secret IDs. Run migrations 028/029 in Supabase SQL Editor.',
      );
    }
    rowIds = normalizeSecretRowIds(issued?.secret_row_ids);
  }

  if (!rowIds.length) {
    return {
      success: true,
      sent: 0,
      message:
        'Registered successfully. Secret IDs will be emailed once the election has voting polls (after the creator finishes setup).',
    };
  }

  const { data: pendingRows, error: rowsError } = await supabase
    .from('secret_ids')
    .select('id, email_status')
    .in('id', rowIds)
    .eq('is_active', true);

  if (rowsError) throw rowsError;

  const toSend = (pendingRows ?? []).filter((row) =>
    ['Pending', 'Failed'].includes(row.email_status),
  );

  if (!toSend.length) {
    return {
      success: true,
      sent: 0,
      message:
        'Registered successfully. Your Secret IDs were already emailed or are not ready yet.',
    };
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const row of toSend) {
    try {
      const result = await invokeEmailService({
        action: 'secret_id_send',
        secret_row_id: row.id,
      });
      sent += result?.sent ?? 0;
      failed += result?.failed ?? 0;
    } catch (sendErr) {
      failed += 1;
      errors.push(sendErr?.message ?? 'Send failed');
    }
  }

  if (sent === 0 && failed > 0) {
    throw new Error(
      errors[0] ??
        'Could not send Secret ID email. Redeploy the send-email Edge Function (see supabase/DEPLOY_SEND_EMAIL.md) and check BREVO_API_KEY.',
    );
  }

  return {
    success: true,
    sent,
    failed,
  };
}

export async function sendAllSecretIdEmails({ electionId }) {
  return invokeEmailService({
    action: 'secret_id_send_all',
    election_id: electionId,
  });
}

export async function retryFailedSecretIdEmails(electionId) {
  return invokeEmailService({
    action: 'retry_failed_emails',
    election_id: electionId,
  });
}

export async function processScheduledEmails() {
  return invokeEmailService({ action: 'process_scheduled_emails' });
}

export async function scheduleElectionEmailReminders(electionId) {
  const { error } = await supabase.rpc('schedule_election_email_reminders', {
    p_election_id: electionId,
  });
  if (error) throw error;
}

export async function fetchEmailLogs({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
