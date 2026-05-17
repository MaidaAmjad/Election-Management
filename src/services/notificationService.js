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

export async function sendSecretIdEmail({ secretRowId }) {
  return invokeEmailService({
    action: 'secret_id_send',
    secret_row_id: secretRowId,
  });
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
