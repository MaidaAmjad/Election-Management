/**
 * Mask secret IDs for UI display. Full values must never be shown in the client.
 */
export function maskSecretId(secretId) {
  if (!secretId || typeof secretId !== 'string') return '****';
  const trimmed = secretId.trim();
  if (trimmed.length <= 4) return '****';
  return `****${trimmed.slice(-4)}`;
}

/**
 * Prevent selecting/copying full ID from masked display elements.
 */
export function preventSecretIdCopy(event) {
  event.preventDefault();
}
