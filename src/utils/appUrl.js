/**
 * Public app URL for links in UI (never expose Resend API key in Vite env).
 * Set VITE_APP_URL in .env — Resend stays in Supabase Edge Function secrets.
 */
export function getAppUrl() {
  const url = import.meta.env.VITE_APP_URL ?? window.location.origin;
  return url.replace(/\/$/, '');
}
