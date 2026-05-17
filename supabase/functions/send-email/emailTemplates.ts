const BRAND = 'Election Management';
const PRIMARY = '#2563eb';

function layout(content: string) {
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

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:${PRIMARY};color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>
  </p>`;
}

export function verificationEmail(opts: {
  name?: string;
  verifyUrl: string;
  expiryMinutes: number;
}) {
  const greeting = opts.name ? `Hello ${opts.name},` : 'Hello,';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Verify Your Email Address</h1>
    <p>${greeting}</p>
    <p>Welcome to ${BRAND}! Please confirm your email address to activate your account and access secure voting features.</p>
    ${button(opts.verifyUrl, 'Verify Email Address')}
    <p style="font-size:13px;color:#64748b;">Or copy this link: <a href="${opts.verifyUrl}" style="color:${PRIMARY};">${opts.verifyUrl}</a></p>
    <p style="font-size:13px;color:#64748b;margin-top:24px;"><strong>This link expires in ${opts.expiryMinutes} minutes.</strong> If you did not create an account, you can safely ignore this email.</p>
  `);
}

export function creatorApprovedEmail(opts: {
  name?: string;
  dashboardUrl: string;
}) {
  const greeting = opts.name ? `Hello ${opts.name},` : 'Hello,';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Creator Request Approved</h1>
    <p>${greeting}</p>
    <p>Great news! Your request to become an Election Creator has been <strong style="color:#16a34a;">approved</strong>.</p>
    <p>You can now create and manage elections, polls, candidates, and voter registrations from your dashboard.</p>
    ${button(opts.dashboardUrl, 'Go to Dashboard')}
    <p>Welcome aboard — we're excited to help you run secure, transparent elections.</p>
  `);
}

export function electionApprovedEmail(opts: {
  name?: string;
  electionTitle: string;
  dashboardUrl: string;
}) {
  const greeting = opts.name ? `Hello ${opts.name},` : 'Hello,';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Approved</h1>
    <p>${greeting}</p>
    <p>Your election <strong>${opts.electionTitle}</strong> has been <strong style="color:#16a34a;">approved</strong> by the administrator.</p>
    <p>It is now published and visible to voters according to your schedule.</p>
    ${button(opts.dashboardUrl, 'View election')}
  `);
}

export function electionRejectedEmail(opts: {
  name?: string;
  electionTitle: string;
  reason: string;
  supportEmail?: string;
}) {
  const greeting = opts.name ? `Hello ${opts.name},` : 'Hello,';
  const support = opts.supportEmail ?? 'support@electionmanagement.local';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Not Approved</h1>
    <p>${greeting}</p>
    <p>Your election <strong>${opts.electionTitle}</strong> was not approved at this time.</p>
    <p style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;"><strong>Reason:</strong> ${opts.reason}</p>
    <p>You may edit the election and submit it again for review from your creator dashboard.</p>
    <p>Questions? Contact <a href="mailto:${support}" style="color:${PRIMARY};">${support}</a>.</p>
  `);
}

export function creatorRejectedEmail(opts: {
  name?: string;
  reason: string;
  supportEmail?: string;
}) {
  const greeting = opts.name ? `Hello ${opts.name},` : 'Hello,';
  const support = opts.supportEmail ?? 'support@electionmanagement.local';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Creator Request Rejected</h1>
    <p>${greeting}</p>
    <p>We regret to inform you that your Election Creator request was not approved at this time.</p>
    <p style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;border-radius:4px;"><strong>Reason:</strong> ${opts.reason}</p>
    <p>If you believe this was a mistake or would like to reapply with additional information, please contact our support team at <a href="mailto:${support}" style="color:${PRIMARY};">${support}</a>.</p>
  `);
}

export function secretIdEmail(opts: {
  voterName: string;
  electionTitle: string;
  pollTitle: string;
  secretId: string;
  voteUrl: string;
}) {
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Your Secret Voting ID</h1>
    <p>Hello ${opts.voterName},</p>
    <p>Your secret voting credentials have been issued for:</p>
    <p><strong>Election:</strong> ${opts.electionTitle}<br/><strong>Poll:</strong> ${opts.pollTitle}</p>
    <p style="text-align:center;font-size:26px;font-weight:700;letter-spacing:3px;background:#f1f5f9;padding:16px;border-radius:8px;color:#0f172a;">${opts.secretId}</p>
    <p><strong>Voting instructions:</strong></p>
    <ol style="padding-left:20px;">
      <li>Sign in to your voter dashboard when voting opens.</li>
      <li>Enter your Secret ID exactly as shown above when prompted.</li>
      <li>Cast your ballot before the election ends.</li>
    </ol>
    ${button(opts.voteUrl, 'Open Voter Dashboard')}
    <p style="background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;font-size:13px;"><strong>Security warning:</strong> Never share your Secret ID. Anyone with this ID could attempt to vote on your behalf. ${BRAND} staff will never ask for your Secret ID.</p>
  `);
}

export function secretIdsRegistrationEmail(opts: {
  voterName: string;
  electionTitle: string;
  voteUrl: string;
  items: { pollTitle: string; secretId: string }[];
}) {
  const rows = opts.items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;color:#334155;">${item.pollTitle}</td>
      <td style="padding:12px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:ui-monospace,monospace;font-size:16px;font-weight:700;color:#0f172a;letter-spacing:2px;">${item.secretId}</td>
    </tr>`,
    )
    .join('');

  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Your Secret Voting ID${opts.items.length > 1 ? 's' : ''}</h1>
    <p>Hello ${opts.voterName},</p>
    <p>Thank you for registering for <strong>${opts.electionTitle}</strong>. Use the Secret ID below when voting opens — we sent this to your email so you can cast an anonymous ballot.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr style="background:#f8fafc;">
        <th style="padding:10px 8px;text-align:left;font-size:12px;color:#64748b;">Poll</th>
        <th style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;">Secret ID</th>
      </tr>
      ${rows}
    </table>
    <p><strong>How to vote:</strong></p>
    <ol style="padding-left:20px;">
      <li>Sign in to your voter dashboard when the election is open.</li>
      <li>Select the poll and enter the matching Secret ID when prompted.</li>
      <li>Choose your candidate and confirm your vote.</li>
    </ol>
    ${button(opts.voteUrl, 'Open Voter Dashboard')}
    <p style="background:#fff7ed;border-left:4px solid #f59e0b;padding:12px 16px;border-radius:4px;font-size:13px;"><strong>Keep this email private.</strong> Anyone with your Secret ID could vote in your place. ${BRAND} will never ask you to share it.</p>
  `);
}

export function electionReminderEmail(opts: {
  electionTitle: string;
  startTime: string;
  dashboardUrl: string;
  hoursUntil: number;
}) {
  const when =
    opts.hoursUntil >= 24
      ? 'in about 24 hours'
      : opts.hoursUntil >= 1
        ? 'in about 1 hour'
        : 'soon';
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Starting Soon</h1>
    <p>The election <strong>${opts.electionTitle}</strong> is scheduled to start ${when}.</p>
    <p><strong>Start time:</strong> ${opts.startTime}</p>
    <p><strong>Voting instructions:</strong> Ensure you are registered, have your Secret ID ready, and sign in before the polling window closes.</p>
    ${button(opts.dashboardUrl, 'Open Dashboard')}
  `);
}

export function electionEndedEmail(opts: {
  electionTitle: string;
  resultsUrl: string;
}) {
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Has Ended</h1>
    <p>The election <strong>${opts.electionTitle}</strong> has concluded. Thank you for participating in this secure democratic process.</p>
    <p>Results will be published once they are verified and finalized by the election administrators. You will receive a separate notification when results are announced.</p>
    ${button(opts.resultsUrl, 'View Election')}
    <p>Thank you for your trust in ${BRAND}.</p>
  `);
}

export function winnerAnnouncementEmail(opts: {
  electionTitle: string;
  winnerName: string;
  totalVotes: number;
  turnoutPercent: number;
  resultsUrl: string;
}) {
  return layout(`
    <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;">Election Results Announced</h1>
    <p>Official results are now available for <strong>${opts.electionTitle}</strong>.</p>
    <p style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
      <span style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Winner</span><br/>
      <span style="font-size:24px;font-weight:700;color:#16a34a;">${opts.winnerName}</span>
    </p>
    <p><strong>Total votes cast:</strong> ${opts.totalVotes.toLocaleString()}<br/>
    <strong>Turnout:</strong> ${opts.turnoutPercent.toFixed(1)}%</p>
    ${button(opts.resultsUrl, 'View Full Results')}
  `);
}
