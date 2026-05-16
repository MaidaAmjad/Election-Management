import { supabase } from '../supabase/supabase';

async function invokeEmailFunction(payload) {
  const { data, error } = await supabase.functions.invoke('send-notification-email', {
    body: payload,
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function sendCreatorApprovedEmail({ to, creatorName }) {
  return invokeEmailFunction({
    to,
    subject: 'Election Request Approved',
    html: `
      <p>Hello${creatorName ? ` ${creatorName}` : ''},</p>
      <p>Your election creator request has been approved. You can now create elections.</p>
      <p>Sign in to your Election Creator dashboard to get started.</p>
    `,
  });
}

export async function sendCreatorRejectedEmail({ to, creatorName, rejectionReason }) {
  return invokeEmailFunction({
    to,
    subject: 'Election Request Rejected',
    html: `
      <p>Hello${creatorName ? ` ${creatorName}` : ''},</p>
      <p>Your election creator request has been rejected.</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
    `,
  });
}
