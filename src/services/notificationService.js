import { sendTransactionalEmail } from './emailService';

export async function sendCreatorApprovedEmail({ to, creatorName }) {
  return sendTransactionalEmail({
    to,
    subject: 'Election Request Approved',
    html: `
      <p>Hello${creatorName ? ` ${creatorName}` : ''},</p>
      <p>Your election creator request has been approved. You can now create elections.</p>
      <p>Sign in to your Election Creator dashboard to get started.</p>
    `,
  });
}

export async function sendCreatorRejectedEmail({
  to,
  creatorName,
  rejectionReason,
}) {
  return sendTransactionalEmail({
    to,
    subject: 'Election Request Rejected',
    html: `
      <p>Hello${creatorName ? ` ${creatorName}` : ''},</p>
      <p>Your election creator request has been rejected.</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
    `,
  });
}
