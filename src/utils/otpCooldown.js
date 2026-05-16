const COOLDOWN_MS = 60_000;
const STORAGE_PREFIX = 'mfa_otp_sent_at:';

function storageKey(email) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

export function getOtpCooldownRemainingMs(email) {
  if (!email?.trim()) return 0;

  const sentAt = Number(sessionStorage.getItem(storageKey(email)));
  if (!sentAt || Number.isNaN(sentAt)) return 0;

  const remaining = COOLDOWN_MS - (Date.now() - sentAt);
  return remaining > 0 ? remaining : 0;
}

export function markOtpSent(email) {
  if (!email?.trim()) return;
  sessionStorage.setItem(storageKey(email), String(Date.now()));
}

export function formatCooldownSeconds(remainingMs) {
  return Math.ceil(remainingMs / 1000);
}
