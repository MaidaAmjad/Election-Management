const MFA_KEY_PREFIX = 'election_mfa_verified_';

export function setMfaVerified(userId) {
  if (!userId) return;
  sessionStorage.setItem(`${MFA_KEY_PREFIX}${userId}`, 'true');
}

export function isMfaVerified(userId) {
  if (!userId) return false;
  return sessionStorage.getItem(`${MFA_KEY_PREFIX}${userId}`) === 'true';
}

export function clearMfaVerified(userId) {
  if (!userId) return;
  sessionStorage.removeItem(`${MFA_KEY_PREFIX}${userId}`);
}
