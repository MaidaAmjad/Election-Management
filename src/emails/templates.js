/**
 * HTML email templates (mirror of supabase/functions/send-email/emailTemplates.ts).
 * Used for previews/documentation; actual sends use the edge function.
 */

const BRAND = 'Election Management';
const PRIMARY = '#2563eb';

function layout(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:${PRIMARY};padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">🛡️ ${BRAND}</p>
        </td></tr>
        <tr><td style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">${content}</td></tr>
        <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} ${BRAND}. Secure online elections.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href, label) {
  return `<p style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:${PRIMARY};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>
  </p>`;
}

export function verificationEmailTemplate({ name, verifyUrl, expiryMinutes }) {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Verify Your Email Address</h1>
    <p>${greeting}</p>
    <p>Welcome to ${BRAND}! Please confirm your email address to activate your account.</p>
    ${button(verifyUrl, 'Verify Email Address')}
    <p style="font-size:13px;color:#64748b;"><strong>This link expires in ${expiryMinutes} minutes.</strong></p>
  `);
}

export function creatorApprovedTemplate({ name, dashboardUrl }) {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Creator Request Approved</h1>
    <p>${greeting}</p>
    <p>Your request to become an Election Creator has been approved.</p>
    ${button(dashboardUrl, 'Go to Dashboard')}
  `);
}

export function creatorRejectedTemplate({ name, reason, supportEmail }) {
  const greeting = name ? `Hello ${name},` : 'Hello,';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Creator Request Rejected</h1>
    <p>${greeting}</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>Contact: ${supportEmail ?? 'support@electionmanagement.local'}</p>
  `);
}

export function secretIdTemplate({
  voterName,
  electionTitle,
  pollTitle,
  secretId,
  voteUrl,
}) {
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Your Secret Voting ID</h1>
    <p>Hello ${voterName},</p>
    <p><strong>${electionTitle}</strong> — ${pollTitle}</p>
    <p style="text-align:center;font-size:26px;font-weight:700;">${secretId}</p>
    ${button(voteUrl, 'Open Voter Dashboard')}
  `);
}

export function electionReminderTemplate({
  electionTitle,
  startTime,
  dashboardUrl,
  hoursUntil,
}) {
  const when =
    hoursUntil >= 24 ? 'in about 24 hours' : hoursUntil >= 1 ? 'in about 1 hour' : 'soon';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Starting Soon</h1>
    <p><strong>${electionTitle}</strong> starts ${when}.</p>
    <p><strong>Start time:</strong> ${startTime}</p>
    ${button(dashboardUrl, 'Open Dashboard')}
  `);
}

export function electionEndedTemplate({ electionTitle, resultsUrl }) {
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Has Ended</h1>
    <p><strong>${electionTitle}</strong> has concluded.</p>
    ${button(resultsUrl, 'View Election')}
  `);
}

export function winnerAnnouncementTemplate({
  electionTitle,
  winnerName,
  totalVotes,
  turnoutPercent,
  resultsUrl,
}) {
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Results Announced</h1>
    <p>Winner: <strong>${winnerName}</strong> for ${electionTitle}</p>
    <p>Votes: ${totalVotes} · Turnout: ${turnoutPercent.toFixed(1)}%</p>
    ${button(resultsUrl, 'View Full Results')}
  `);
}
