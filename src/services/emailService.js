import { supabase } from '../supabase/supabase';

/**
 * All transactional email goes through the send-email edge function (Brevo).
 * Never call Brevo from the browser — the API key stays in Supabase secrets.
 */
function formatInvokeError(error) {
  const message = error?.message ?? '';

  if (
    message.includes('Failed to send a request to the Edge Function') ||
    message.includes('FunctionsFetchError') ||
    message.includes('404')
  ) {
    return new Error(
      'The send-email Edge Function is not deployed yet. In Supabase Dashboard → Edge Functions, deploy a function named send-email (see supabase/DEPLOY_SEND_EMAIL.md).',
    );
  }

  return error;
}

async function readEdgeFunctionErrorBody(error) {
  const ctx = error?.context;
  if (!ctx) return null;

  try {
    if (typeof ctx.json === 'function') {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
    if (typeof ctx.text === 'function') {
      const text = await ctx.text();
      if (text) {
        try {
          const parsed = JSON.parse(text);
          return parsed?.error ?? parsed?.message ?? text;
        } catch {
          return text;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

export async function invokeEmailService(payload) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: payload,
  });

  if (error) {
    const detail = (await readEdgeFunctionErrorBody(error)) ?? error.message;
    const wrapped = formatInvokeError({ ...error, message: detail });
    throw wrapped;
  }
  if (data?.error) throw new Error(String(data.error));
  if (data?.success === false && data?.error) throw new Error(String(data.error));
  return data;
}

export async function sendTransactionalEmail({ to, subject, html }) {
  return invokeEmailService({
    action: 'send',
    to,
    subject,
    html,
  });
}

export async function sendMfaOtpEmail(email) {
  return invokeEmailService({
    action: 'mfa_send',
    email: email.trim().toLowerCase(),
  });
}

export async function verifyMfaOtpEmail(email, code) {
  return invokeEmailService({
    action: 'mfa_verify',
    email: email.trim().toLowerCase(),
    code: code.trim(),
  });
}

export async function sendPasswordResetEmail(email) {
  return invokeEmailService({
    action: 'password_reset_send',
    email: email.trim().toLowerCase(),
  });
}

export async function completePasswordResetWithToken(token, password) {
  return invokeEmailService({
    action: 'password_reset_complete',
    token: token.trim(),
    password,
  });
}

export async function confirmSignupEmail(userId) {
  return invokeEmailService({
    action: 'confirm_signup_email',
    userId,
  });
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
