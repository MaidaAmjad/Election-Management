import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const OTP_EXPIRY_MINUTES = 10;
const RESET_EXPIRY_MINUTES = 60;

type EmailAction =
  | 'send'
  | 'mfa_send'
  | 'mfa_verify'
  | 'password_reset_send'
  | 'password_reset_complete'
  | 'confirm_signup_email'
  | 'secret_id_send'
  | 'secret_id_send_all';

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
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase URL or service role key. SUPABASE_SERVICE_ROLE_KEY is provided automatically as a default Edge Function secret.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

async function storeCode(
  admin: ReturnType<typeof getAdminClient>,
  email: string,
  purpose: 'mfa' | 'password_reset',
  plainCode: string,
  metadata: Record<string, unknown> = {},
) {
  const codeHash = await hashCode(email, purpose, plainCode);
  const expiresAt = new Date();
  expiresAt.setMinutes(
    expiresAt.getMinutes() +
      (purpose === 'mfa' ? OTP_EXPIRY_MINUTES : RESET_EXPIRY_MINUTES),
  );

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
  purpose: 'mfa' | 'password_reset',
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

function appOrigin() {
  return (
    Deno.env.get('APP_URL') ??
    Deno.env.get('SITE_URL') ??
    'http://localhost:5173'
  ).replace(/\/$/, '');
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
      const result = await sendResendEmail({ to, subject, html });
      return jsonResponse({ success: true, id: result.id });
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

    if (action === 'secret_id_send' || action === 'secret_id_send_all') {
      const electionId = body.election_id as string | undefined;
      const rowId = body.secret_row_id as string | undefined;

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
          polls ( title ),
          profiles:voter_id ( full_name )
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
        const voterName =
          (row.profiles as { full_name?: string })?.full_name ?? 'Voter';
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

        try {
          await sendResendEmail({
            to: email,
            subject: 'Your Secret Voting ID',
            html: `
              <p>Hello ${voterName},</p>
              <p>Your secret voting ID for the election:</p>
              <p><strong>${electionTitle}</strong> — ${pollTitle}</p>
              <p style="font-size:22px;font-weight:bold;letter-spacing:2px;">${row.secret_id}</p>
              <p>Keep this ID confidential because it will be required during voting.</p>
            `,
          });

          await admin.rpc('update_secret_id_email_status', {
            p_secret_row_id: row.id,
            p_status: 'Sent',
            p_log_action: 'Email sent',
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

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('[send-email]', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'Unexpected error' },
      500,
    );
  }
});
