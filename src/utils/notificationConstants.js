export const NOTIFICATION_TYPES = {
  ALL: 'all',
  APPROVAL: 'approval',
  REJECTION: 'rejection',
  EMAIL_VERIFICATION: 'email_verification',
  SECRET_ID: 'secret_id',
  ELECTION_REMINDER: 'election_reminder',
  ELECTION_ENDED: 'election_ended',
  RESULT_ANNOUNCED: 'result_announced',
};

export const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.APPROVAL]: 'Approval',
  [NOTIFICATION_TYPES.REJECTION]: 'Rejection',
  [NOTIFICATION_TYPES.EMAIL_VERIFICATION]: 'Email verification',
  [NOTIFICATION_TYPES.SECRET_ID]: 'Secret ID',
  [NOTIFICATION_TYPES.ELECTION_REMINDER]: 'Election reminder',
  [NOTIFICATION_TYPES.ELECTION_ENDED]: 'Election ended',
  [NOTIFICATION_TYPES.RESULT_ANNOUNCED]: 'Results',
};

export const EMAIL_STATUS = {
  PENDING: 'Pending',
  SENT: 'Sent',
  FAILED: 'Failed',
};

export const READ_FILTER = {
  ALL: 'all',
  READ: 'read',
  UNREAD: 'unread',
};

export function getNotificationCenterPath(role) {
  if (role === 'Super Admin') return '/admin-dashboard/notifications';
  if (role === 'Election Creator') return '/creator-dashboard/notifications';
  return '/voter-dashboard/notifications';
}
