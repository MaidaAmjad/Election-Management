import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  creatorApprovedEmail,
  creatorRejectedEmail,
  electionApprovedEmail,
  electionRejectedEmail,
  electionEndedEmail,
  electionReminderEmail,
  secretIdEmail,
  secretIdsRegistrationEmail,
  verificationEmail,
  winnerAnnouncementEmail,
} from './emailTemplates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const OTP_EXPIRY_MINUTES = 10;
const RESET_EXPIRY_MINUTES = 60;
const SIGNUP_VERIFY_EXPIRY_MINUTES = 60;
const RESEND_COOLDOWN_SECONDS = 60;

type CodePurpose = 'mfa' | 'password_reset' | 'signup_verify';

type EmailAction =
  | 'send'
  | 'mfa_send'
  | 'mfa_verify'
  | 'password_reset_send'
  | 'password_reset_complete'
  | 'confirm_signup_email'
  | 'signup_verification_send'
  | 'signup_verification_verify'
  | 'creator_approved_notify'
  | 'creator_rejected_notify'
  | 'election_approved_notify'
  | 'election_rejected_notify'
  | 'secret_id_send'
  | 'secret_id_send_all'
  | 'secret_id_registration_notify'
  | 'process_scheduled_emails'
  | 'retry_failed_emails';

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashCode(
  email: string,
  purpose: string,
  plainCode: string,
): Promise<string> {
  return sha256(`${email.toLowerCase()}:${purpose}:${plainCode}`);
}

function generateNumericOtp(length = 6): string {
  const max = 10 ** length;
  const num = crypto.getRandomValues(new Uint32Array(1))[0] % max;
  return String(num).padStart(length, '0');
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase URL or service role key. SUPABASE_SERVICE_ROLE_KEY is provided automatically as a default Edge Function secret.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getUserClient(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function appOrigin() {
  return (
    Deno.env.get('APP_URL') ??
    Deno.env.get('SITE_URL') ??
    'http://localhost:5173'
  ).replace(/\/$/, '');
}

function dashboardPathForRole(role: string) {
  if (role === 'Super Admin') return '/admin-dashboard';
  if (role === 'Election Creator') return '/creator-dashboard';
  return '/voter-dashboard';
}

async function logEmail(
  admin: ReturnType<typeof getAdminClient>,
  opts: {
    recipientEmail: string;
    subject: string;
    status: 'Pending' | 'Sent' | 'Failed';
    errorMessage?: string;
    userId?: string | null;
    notificationType?: string;
    electionId?: string | null;
  },
) {
  const { error } = await admin.from('email_logs').insert({
    recipient_email: opts.recipientEmail,
    subject: opts.subject,
    status: opts.status,
    error_message: opts.errorMessage ?? null,
    user_id: opts.userId ?? null,
    notification_type: opts.notificationType ?? null,
    election_id: opts.electionId ?? null,
    sent_at: opts.status === 'Sent' ? new Date().toISOString() : null,
  });
  if (error) console.error('[email_logs]', error);
}

async function createInAppNotification(
  admin: ReturnType<typeof getAdminClient>,
  opts: {
    userId: string;
    title: string;
    message: string;
    type: string;
    electionId?: string | null;
  },
) {
  const { error } = await admin.rpc('create_notification', {
    p_user_id: opts.userId,
    p_title: opts.title,
    p_message: opts.message,
    p_type: opts.type,
    p_election_id: opts.electionId ?? null,
    p_metadata: {},
  });
  if (error) console.error('[create_notification]', error);
}

async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail =
    Deno.env.get('NOTIFICATION_FROM_EMAIL') ??
    'Election Management <onboarding@resend.dev>';

  if (!resendKey) {
    throw new Error(
      'RESEND_API_KEY is not configured. Set it in Supabase Edge Function secrets.',
    );
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.message ?? 'Failed to send email via Resend.');
  }
  return result;
}

async function fetchVoterName(
  admin: ReturnType<typeof getAdminClient>,
  voterId: string,
): Promise<string> {
  const { data } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', voterId)
    .maybeSingle();
  return data?.full_name ?? 'Voter';
}

/** Use provided email or fall back to the user's auth email (service role). */
async function resolveRecipientEmail(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  providedEmail?: string | null,
): Promise<string> {
  const fromBody = String(providedEmail ?? '').trim().toLowerCase();
  if (fromBody && fromBody !== 'null' && fromBody !== 'undefined') {
    return fromBody;
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;

  const authEmail = data?.user?.email?.trim().toLowerCase();
  if (!authEmail) {
    throw new Error('No email address found for this user.');
  }
  return authEmail;
}

async function sendWithLog(
  admin: ReturnType<typeof getAdminClient>,
  opts: {
    to: string;
    subject: string;
    html: string;
    userId?: string | null;
    notificationType?: string;
    electionId?: string | null;
  },
) {
  const logId = crypto.randomUUID();
  await logEmail(admin, {
    recipientEmail: opts.to,
    subject: opts.subject,
    status: 'Pending',
    userId: opts.userId,
    notificationType: opts.notificationType,
    electionId: opts.electionId,
  });

  try {
    const result = await sendResendEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    await admin
      .from('email_logs')
      .update({
        status: 'Sent',
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('recipient_email', opts.to)
      .eq('subject', opts.subject)
      .eq('status', 'Pending')
      .order('created_at', { ascending: false })
      .limit(1);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Send failed';
    await admin
      .from('email_logs')
      .update({ status: 'Failed', error_message: msg })
      .eq('recipient_email', opts.to)
      .eq('subject', opts.subject)
      .eq('status', 'Pending')
      .order('created_at', { ascending: false })
      .limit(1);
    throw err;
  }
}

async function storeCode(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
  purpose: CodePurpose,
  plainCode: string,
  metadata: Record<string, unknown> = {},
) {
  const codeHash = await hashCode(email, purpose, plainCode);
  const expiresAt = new Date();
  const minutes =
    purpose === 'mfa'
      ? OTP_EXPIRY_MINUTES
      : purpose === 'signup_verify'
        ? SIGNUP_VERIFY_EXPIRY_MINUTES
        : RESET_EXPIRY_MINUTES;
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);

  const { error } = await admin.from('email_verification_codes').insert({
    email: email.toLowerCase(),
    code_hash: codeHash,
    purpose,
    metadata,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;
}

async function verifyAndConsumeCode(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
  purpose: CodePurpose,
  plainCode: string,
) {
  const codeHash = await hashCode(email, purpose, plainCode);

  const { data: rows, error } = await admin
    .from('email_verification_codes')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('purpose', purpose)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  if (!rows?.length) return false;

  await admin
    .from('email_verification_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', rows[0].id);

  return true;
}

async function findPasswordResetRow(
  admin: ReturnType<typeof getAdminClient>,
  token: string,
) {
  const { data: rows, error } = await admin
    .from('email_verification_codes')
    .select('id, email, metadata')
    .eq('purpose', 'password_reset')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  for (const row of rows ?? []) {
    const expected = await hashCode(row.email, 'password_reset', token);
    const { data: match } = await admin
      .from('email_verification_codes')
      .select('id, email, metadata')
      .eq('id', row.id)
      .eq('code_hash', expected)
      .maybeSingle();

    if (match) {
      await admin
        .from('email_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', match.id);
      return match;
    }
  }

  return null;
}

async function findSignupVerifyRow(
  admin: ReturnType<typeof getAdminClient>,
  token: string,
) {
  const { data: rows, error } = await admin
    .from('email_verification_codes')
    .select('id, email, metadata')
    .eq('purpose', 'signup_verify')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  for (const row of rows ?? []) {
    const expected = await hashCode(row.email, 'signup_verify', token);
    const { data: match } = await admin
      .from('email_verification_codes')
      .select('id, email, metadata')
      .eq('id', row.id)
      .eq('code_hash', expected)
      .maybeSingle();

    if (match) return match;
  }

  return null;
}

async function findUserIdByEmail(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
) {
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;

  const user = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  return user?.id ?? null;
}

async function checkResendCooldown(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
  purpose: CodePurpose,
) {
  const since = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
  const { data, error } = await admin
    .from('email_verification_codes')
    .select('id')
    .eq('email', email.toLowerCase())
    .eq('purpose', purpose)
    .gte('created_at', since)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function getElectionParticipants(
  admin: ReturnType<typeof getAdminClient>,
  electionId: string,
) {
  const { data: election, error: eErr } = await admin
    .from('elections')
    .select('id, title, creator_id, start_datetime, end_datetime, winner_id, turnout_percentage, result_status')
    .eq('id', electionId)
    .single();
  if (eErr) throw eErr;

  const { data: registrations } = await admin
    .from('voter_registrations')
    .select('voter_id')
    .eq('election_id', electionId)
    .in('status', ['Registered', 'Approved']);

  const userIds = new Set<string>();
  if (election.creator_id) userIds.add(election.creator_id);
  for (const r of registrations ?? []) {
    if (r.voter_id) userIds.add(r.voter_id);
  }

  return { election, userIds: [...userIds] };
}

async function processScheduleRow(
  admin: ReturnType<typeof getAdminClient>,
  schedule: {
    id: string;
    election_id: string;
    schedule_type: string;
  },
) {
  const { election, userIds } = await getElectionParticipants(
    admin,
    schedule.election_id,
  );
  const origin = appOrigin();
  const startFormatted = new Date(election.start_datetime).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  let sent = 0;
  let failed = 0;

  if (schedule.schedule_type === 'reminder_24h' || schedule.schedule_type === 'reminder_1h') {
    const hoursUntil = schedule.schedule_type === 'reminder_24h' ? 24 : 1;
    const subject = 'Election Starting Soon';
    const html = electionReminderEmail({
      electionTitle: election.title,
      startTime: startFormatted,
      dashboardUrl: `${origin}/elections/${election.id}`,
      hoursUntil,
    });

    for (const userId of userIds) {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;
      try {
        await sendWithLog(admin, {
          to: email,
          subject,
          html,
          userId,
          notificationType: 'election_reminder',
          electionId: election.id,
        });
        await createInAppNotification(admin, {
          userId,
          title: 'Election starting soon',
          message: `${election.title} starts ${hoursUntil === 24 ? 'in about 24 hours' : 'in about 1 hour'}.`,
          type: 'election_reminder',
          electionId: election.id,
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
  } else if (schedule.schedule_type === 'election_end') {
    const subject = 'Election Has Ended';
    const html = electionEndedEmail({
      electionTitle: election.title,
      resultsUrl: `${origin}/elections/${election.id}`,
    });

    for (const userId of userIds) {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;
      try {
        await sendWithLog(admin, {
          to: email,
          subject,
          html,
          userId,
          notificationType: 'election_ended',
          electionId: election.id,
        });
        await createInAppNotification(admin, {
          userId,
          title: 'Election has ended',
          message: `${election.title} has concluded. Results will be published when finalized.`,
          type: 'election_ended',
          electionId: election.id,
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
  } else if (schedule.schedule_type === 'winner_announcement') {
    if (election.result_status !== 'Finalized' || !election.winner_id) {
      return { skipped: true, reason: 'Results not finalized' };
    }

    const { data: winner } = await admin
      .from('candidates')
      .select('name')
      .eq('id', election.winner_id)
      .maybeSingle();

    const { data: pollIds } = await admin
      .from('polls')
      .select('id')
      .eq('election_id', election.id);
    const pollIdList = (pollIds ?? []).map((p: { id: string }) => p.id);
    let totalVotes = 0;
    if (pollIdList.length) {
      const { count } = await admin
        .from('votes')
        .select('id', { count: 'exact', head: true })
        .in('poll_id', pollIdList);
      totalVotes = count ?? 0;
    }

    const subject = 'Election Results Announced';
    const html = winnerAnnouncementEmail({
      electionTitle: election.title,
      winnerName: winner?.name ?? 'Winner',
      totalVotes,
      turnoutPercent: Number(election.turnout_percentage ?? 0),
      resultsUrl: `${origin}/elections/${election.id}`,
    });

    for (const userId of userIds) {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      const email = userData?.user?.email;
      if (!email) continue;
      try {
        await sendWithLog(admin, {
          to: email,
          subject,
          html,
          userId,
          notificationType: 'result_announced',
          electionId: election.id,
        });
        await createInAppNotification(admin, {
          userId,
          title: 'Results announced',
          message: `Official results for ${election.title} are now available.`,
          type: 'result_announced',
          electionId: election.id,
        });
        sent += 1;
      } catch {
        failed += 1;
      }
    }
  }

  await admin
    .from('email_schedules')
    .update({
      status: failed > 0 && sent === 0 ? 'failed' : 'sent',
      sent_at: new Date().toISOString(),
      error_message: failed > 0 ? `${failed} recipient(s) failed` : null,
    })
    .eq('id', schedule.id);

  return { sent, failed };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action as EmailAction | undefined;

    if (!action) {
      return jsonResponse({ error: 'Missing action' }, 400);
    }

    if (action === 'send') {
      const { to, subject, html } = body;
      if (!to || !subject || !html) {
        return jsonResponse({ error: 'Missing to, subject, or html' }, 400);
      }
      const admin = getAdminClient();
      await sendWithLog(admin, { to, subject, html });
      return jsonResponse({ success: true });
    }

    const admin = getAdminClient();

    if (action === 'mfa_send') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!email) return jsonResponse({ error: 'Email is required' }, 400);

      const code = generateNumericOtp(6);
      await storeCode(admin, email, 'mfa', code);

      await sendResendEmail({
        to: email,
        subject: 'Your verification code',
        html: `
          <p>Your Election Management verification code is:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });

      return jsonResponse({ success: true });
    }

    if (action === 'mfa_verify') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const code = String(body.code ?? '').trim();
      if (!email || !code) {
        return jsonResponse({ error: 'Email and code are required' }, 400);
      }

      const valid = await verifyAndConsumeCode(admin, email, 'mfa', code);
      if (!valid) {
        return jsonResponse(
          { error: 'Invalid or expired verification code' },
          400,
        );
      }

      return jsonResponse({ success: true, valid: true });
    }

    if (action === 'password_reset_send') {
      const email = String(body.email ?? '').trim().toLowerCase();
      if (!email) return jsonResponse({ error: 'Email is required' }, 400);

      const userId = await findUserIdByEmail(admin, email);
      if (userId) {
        const token = generateToken();
        await storeCode(admin, email, 'password_reset', token, {
          user_id: userId,
        });

        const resetUrl = `${appOrigin()}/reset-password?token=${encodeURIComponent(token)}`;

        await sendResendEmail({
          to: email,
          subject: 'Reset your password',
          html: `
            <p>You requested a password reset for Election Management.</p>
            <p><a href="${resetUrl}">Reset your password</a></p>
            <p>Or copy this link: ${resetUrl}</p>
            <p>This link expires in ${RESET_EXPIRY_MINUTES} minutes.</p>
            <p>If you did not request this, ignore this email.</p>
          `,
        });
      }

      return jsonResponse({ success: true });
    }

    if (action === 'password_reset_complete') {
      const token = String(body.token ?? '').trim();
      const password = String(body.password ?? '');
      if (!token || !password) {
        return jsonResponse({ error: 'Token and password are required' }, 400);
      }
      if (password.length < 8) {
        return jsonResponse(
          { error: 'Password must be at least 8 characters' },
          400,
        );
      }

      const row = await findPasswordResetRow(admin, token);
      if (!row) {
        return jsonResponse({ error: 'Invalid or expired reset link' }, 400);
      }

      const userId = (row.metadata as { user_id?: string })?.user_id;
      if (!userId) {
        return jsonResponse({ error: 'Invalid reset token' }, 400);
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(
        userId,
        { password },
      );
      if (updateError) throw updateError;

      return jsonResponse({ success: true });
    }

    if (action === 'confirm_signup_email') {
      const userId = String(body.userId ?? '').trim();
      if (!userId) return jsonResponse({ error: 'userId is required' }, 400);

      const { error } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (error) throw error;

      return jsonResponse({ success: true });
    }

    if (action === 'signup_verification_send') {
      const email = String(body.email ?? '').trim().toLowerCase();
      const userId = String(body.userId ?? '').trim();
      const fullName = String(body.fullName ?? '').trim();
      if (!email || !userId) {
        return jsonResponse({ error: 'email and userId are required' }, 400);
      }

      if (await checkResendCooldown(admin, email, 'signup_verify')) {
        return jsonResponse(
          {
            error: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting another email.`,
            cooldown: true,
          },
          429,
        );
      }

      const token = generateToken();
      await storeCode(admin, email, 'signup_verify', token, { user_id: userId });

      const verifyUrl = `${appOrigin()}/verify-email?token=${encodeURIComponent(token)}`;
      const subject = 'Verify Your Email Address';

      await sendWithLog(admin, {
        to: email,
        subject,
        html: verificationEmail({
          name: fullName || undefined,
          verifyUrl,
          expiryMinutes: SIGNUP_VERIFY_EXPIRY_MINUTES,
        }),
        userId,
        notificationType: 'email_verification',
      });

      return jsonResponse({ success: true });
    }

    if (action === 'signup_verification_verify') {
      const token = String(body.token ?? '').trim();
      if (!token) return jsonResponse({ error: 'token is required' }, 400);

      const row = await findSignupVerifyRow(admin, token);
      if (!row) {
        return jsonResponse({ error: 'Invalid or expired verification link' }, 400);
      }

      const userId = (row.metadata as { user_id?: string })?.user_id;
      if (!userId) {
        return jsonResponse({ error: 'Invalid verification token' }, 400);
      }

      await admin
        .from('email_verification_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', row.id);

      const { error } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (error) throw error;

      await createInAppNotification(admin, {
        userId,
        title: 'Email verified',
        message: 'Your email address has been verified successfully.',
        type: 'email_verification',
      });

      return jsonResponse({ success: true, email: row.email });
    }

    if (action === 'creator_approved_notify') {
      const userId = String(body.userId ?? '').trim();
      const creatorName = String(body.creatorName ?? '').trim();
      const role = String(body.role ?? 'Election Creator');
      if (!userId) {
        return jsonResponse({ error: 'userId is required' }, 400);
      }

      let email: string;
      try {
        email = await resolveRecipientEmail(
          admin,
          userId,
          body.email as string | undefined,
        );
      } catch (resolveErr) {
        const msg =
          resolveErr instanceof Error
            ? resolveErr.message
            : 'Could not resolve recipient email.';
        return jsonResponse({ error: msg }, 400);
      }

      const subject = 'Election Creator Request Approved';
      const dashboardUrl = `${appOrigin()}${dashboardPathForRole(role)}`;

      await sendWithLog(admin, {
        to: email,
        subject,
        html: creatorApprovedEmail({ name: creatorName, dashboardUrl }),
        userId,
        notificationType: 'approval',
      });

      await createInAppNotification(admin, {
        userId,
        title: 'Creator request approved',
        message: 'Your Election Creator request has been approved. You can now create elections.',
        type: 'approval',
      });

      return jsonResponse({ success: true });
    }

    if (action === 'creator_rejected_notify') {
      const userId = String(body.userId ?? '').trim();
      const creatorName = String(body.creatorName ?? '').trim();
      const reason = String(body.rejectionReason ?? 'No reason provided.');
      if (!userId) {
        return jsonResponse({ error: 'userId is required' }, 400);
      }

      let email: string;
      try {
        email = await resolveRecipientEmail(
          admin,
          userId,
          body.email as string | undefined,
        );
      } catch (resolveErr) {
        const msg =
          resolveErr instanceof Error
            ? resolveErr.message
            : 'Could not resolve recipient email.';
        return jsonResponse({ error: msg }, 400);
      }

      const subject = 'Election Creator Request Rejected';

      await sendWithLog(admin, {
        to: email,
        subject,
        html: creatorRejectedEmail({
          name: creatorName,
          reason,
          supportEmail: Deno.env.get('SUPPORT_EMAIL') ?? undefined,
        }),
        userId,
        notificationType: 'rejection',
      });

      await createInAppNotification(admin, {
        userId,
        title: 'Creator request rejected',
        message: `Your request was not approved. Reason: ${reason}`,
        type: 'rejection',
      });

      return jsonResponse({ success: true });
    }

    if (action === 'election_approved_notify') {
      const userId = String(body.userId ?? '').trim();
      const creatorName = String(body.creatorName ?? '').trim();
      const electionTitle = String(body.electionTitle ?? 'Your election').trim();
      if (!userId) {
        return jsonResponse({ error: 'userId is required' }, 400);
      }

      let email: string;
      try {
        email = await resolveRecipientEmail(
          admin,
          userId,
          body.email as string | undefined,
        );
      } catch (resolveErr) {
        const msg =
          resolveErr instanceof Error
            ? resolveErr.message
            : 'Could not resolve recipient email.';
        return jsonResponse({ error: msg }, 400);
      }

      const dashboardUrl = `${appOrigin()}/creator-dashboard/elections`;

      await sendWithLog(admin, {
        to: email,
        subject: `Election approved: ${electionTitle}`,
        html: electionApprovedEmail({
          name: creatorName,
          electionTitle,
          dashboardUrl,
        }),
        userId,
        notificationType: 'approval',
      });

      await createInAppNotification(admin, {
        userId,
        title: 'Election approved',
        message: `"${electionTitle}" was approved and is now published.`,
        type: 'approval',
      });

      return jsonResponse({ success: true });
    }

    if (action === 'election_rejected_notify') {
      const userId = String(body.userId ?? '').trim();
      const creatorName = String(body.creatorName ?? '').trim();
      const electionTitle = String(body.electionTitle ?? 'Your election').trim();
      const reason = String(body.rejectionReason ?? 'No reason provided.');
      if (!userId) {
        return jsonResponse({ error: 'userId is required' }, 400);
      }

      let email: string;
      try {
        email = await resolveRecipientEmail(
          admin,
          userId,
          body.email as string | undefined,
        );
      } catch (resolveErr) {
        const msg =
          resolveErr instanceof Error
            ? resolveErr.message
            : 'Could not resolve recipient email.';
        return jsonResponse({ error: msg }, 400);
      }

      await sendWithLog(admin, {
        to: email,
        subject: `Election not approved: ${electionTitle}`,
        html: electionRejectedEmail({
          name: creatorName,
          electionTitle,
          reason,
          supportEmail: Deno.env.get('SUPPORT_EMAIL') ?? undefined,
        }),
        userId,
        notificationType: 'rejection',
      });

      await createInAppNotification(admin, {
        userId,
        title: 'Election rejected',
        message: `"${electionTitle}" was not approved. Reason: ${reason}`,
        type: 'rejection',
      });

      return jsonResponse({ success: true });
    }

    if (action === 'secret_id_send' || action === 'secret_id_send_all') {
      const electionId = body.election_id as string | undefined;
      const rowId = body.secret_row_id as string | undefined;
      const origin = appOrigin();

      let query = admin
        .from('secret_ids')
        .select(
          `
          id,
          secret_id,
          email_status,
          election_id,
          poll_id,
          voter_id,
          elections ( title ),
          polls ( title )
        `,
        )
        .eq('is_active', true);

      if (action === 'secret_id_send') {
        if (!rowId) {
          return jsonResponse({ error: 'secret_row_id is required' }, 400);
        }
        query = query.eq('id', rowId);
      } else {
        if (!electionId) {
          return jsonResponse({ error: 'election_id is required' }, 400);
        }
        query = query.eq('election_id', electionId);
      }

      const { data: rows, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      const list = rows ?? [];
      let sent = 0;
      let failed = 0;

      for (const row of list) {
        const { data: userData } = await admin.auth.admin.getUserById(
          row.voter_id,
        );
        const email = userData?.user?.email;
        const voterName = await fetchVoterName(admin, row.voter_id);
        const electionTitle =
          (row.elections as { title?: string })?.title ?? 'Election';
        const pollTitle = (row.polls as { title?: string })?.title ?? 'Poll';

        if (!email) {
          await admin.rpc('update_secret_id_email_status', {
            p_secret_row_id: row.id,
            p_status: 'Failed',
            p_log_action: 'Email failed',
          });
          failed += 1;
          continue;
        }

        const subject = 'Your Secret Voting ID';
        try {
          await sendWithLog(admin, {
            to: email,
            subject,
            html: secretIdEmail({
              voterName,
              electionTitle,
              pollTitle,
              secretId: row.secret_id,
              voteUrl: `${origin}/voter-dashboard/vote`,
            }),
            userId: row.voter_id,
            notificationType: 'secret_id',
            electionId: row.election_id,
          });

          await admin.rpc('update_secret_id_email_status', {
            p_secret_row_id: row.id,
            p_status: 'Sent',
            p_log_action: 'Email sent',
          });

          await createInAppNotification(admin, {
            userId: row.voter_id,
            title: 'Secret ID issued',
            message: `Your secret voting ID for ${electionTitle} — ${pollTitle} has been sent to your email.`,
            type: 'secret_id',
            electionId: row.election_id,
          });

          sent += 1;
        } catch {
          await admin.rpc('update_secret_id_email_status', {
            p_secret_row_id: row.id,
            p_status: 'Failed',
            p_log_action: 'Email failed',
          });
          failed += 1;
        }
      }

      return jsonResponse({
        success: true,
        sent,
        failed,
        total: list.length,
      });
    }

    if (action === 'secret_id_registration_notify') {
      const electionId = body.election_id as string | undefined;
      if (!electionId) {
        return jsonResponse({ error: 'election_id is required' }, 400);
      }

      const userClient = getUserClient(req);
      if (!userClient) {
        return jsonResponse({ error: 'Authentication required' }, 401);
      }

      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser();
      if (userError || !user) {
        return jsonResponse({ error: 'Authentication required' }, 401);
      }

      let issueResult: Record<string, unknown> | null = null;
      const { data: issued, error: issueError } = await admin.rpc(
        'issue_secret_ids_for_voter',
        {
          p_election_id: electionId,
          p_voter_id: user.id,
        },
      );
      if (issueError) {
        console.error('[secret_id_registration_notify] issue_secret_ids_for_voter', issueError);
        return jsonResponse(
          {
            success: false,
            error:
              issueError.message ??
              'Could not create Secret IDs. Run migration 028/029 in Supabase SQL Editor.',
          },
          500,
        );
      }
      issueResult = issued as Record<string, unknown> | null;

      const { data: secretRows, error: rowsError } = await admin
        .from('secret_ids')
        .select('id, secret_id, poll_id, email_status')
        .eq('election_id', electionId)
        .eq('voter_id', user.id)
        .eq('is_active', true)
        .in('email_status', ['Pending', 'Failed']);

      if (rowsError) throw rowsError;

      const rows = secretRows ?? [];
      if (!rows.length) {
        return jsonResponse({
          success: true,
          sent: 0,
          message:
            'Registered successfully. Secret IDs will be emailed when polls are available for this election.',
        });
      }

      const pollIds = [...new Set(rows.map((r) => r.poll_id))];
      const { data: polls } = await admin
        .from('polls')
        .select('id, title')
        .in('id', pollIds);
      const pollTitleById = Object.fromEntries(
        (polls ?? []).map((p) => [p.id, p.title]),
      );

      const { data: election } = await admin
        .from('elections')
        .select('title')
        .eq('id', electionId)
        .maybeSingle();

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const { data: userData } = await admin.auth.admin.getUserById(user.id);
      const email = userData?.user?.email;
      if (!email) {
        return jsonResponse({
          success: false,
          error: 'No email address on your account.',
        });
      }

      const origin = appOrigin();
      const voterName = profile?.full_name ?? 'Voter';
      const electionTitle = election?.title ?? 'Election';
      const items = rows.map((row) => ({
        pollTitle: pollTitleById[row.poll_id] ?? 'Poll',
        secretId: row.secret_id,
      }));

      const subject =
        items.length > 1
          ? `Your Secret Voting IDs — ${electionTitle}`
          : `Your Secret Voting ID — ${electionTitle}`;

      try {
        await sendWithLog(admin, {
          to: email,
          subject,
          html: secretIdsRegistrationEmail({
            voterName,
            electionTitle,
            voteUrl: `${origin}/voter-dashboard/vote`,
            items,
          }),
          userId: user.id,
          notificationType: 'secret_id',
          electionId,
        });

        for (const row of rows) {
          const { error: statusErr } = await admin.rpc('update_secret_id_email_status', {
            p_secret_row_id: row.id,
            p_status: 'Sent',
            p_log_action: 'Registration email sent',
          });
          if (statusErr) console.error('[update_secret_id_email_status]', statusErr);
        }

        await createInAppNotification(admin, {
          userId: user.id,
          title: 'Secret ID sent to your email',
          message: `Your voting credentials for ${electionTitle} were sent to ${email}.`,
          type: 'secret_id',
          electionId,
        });

        return jsonResponse({
          success: true,
          sent: rows.length,
          generated_count: issueResult?.generated_count ?? 0,
        });
      } catch (sendErr) {
        console.error('[secret_id_registration_notify] send', sendErr);
        for (const row of rows) {
          const { error: statusErr } = await admin.rpc(
            'update_secret_id_email_status',
            {
              p_secret_row_id: row.id,
              p_status: 'Failed',
              p_log_action: 'Registration email failed',
            },
          );
          if (statusErr) {
            console.error('[update_secret_id_email_status]', statusErr);
          }
        }
        const msg =
          sendErr instanceof Error
            ? sendErr.message
            : 'Failed to send Secret ID email.';
        return jsonResponse({ success: false, error: msg }, 500);
      }
    }

    if (action === 'process_scheduled_emails') {
      const { data: due, error: dueErr } = await admin
        .from('email_schedules')
        .select('id, election_id, schedule_type')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .limit(20);

      if (dueErr) throw dueErr;

      let processed = 0;
      const results: Record<string, unknown>[] = [];

      for (const row of due ?? []) {
        const result = await processScheduleRow(admin, row);
        if (!(result as { skipped?: boolean })?.skipped) {
          processed += 1;
        }
        results.push({ id: row.id, ...result });
      }

      return jsonResponse({ success: true, processed, results });
    }

    if (action === 'retry_failed_emails') {
      const electionId = body.election_id as string | undefined;
      let query = admin
        .from('secret_ids')
        .select('id')
        .eq('email_status', 'Failed')
        .eq('is_active', true);

      if (electionId) query = query.eq('election_id', electionId);

      const { data: failedRows } = await query;
      let retried = 0;

      for (const row of failedRows ?? []) {
        const res = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'secret_id_send',
              secret_row_id: row.id,
            }),
          },
        );
        if (res.ok) retried += 1;
      }

      return jsonResponse({ success: true, retried });
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('[send-email]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      500,
    );
  }
});
