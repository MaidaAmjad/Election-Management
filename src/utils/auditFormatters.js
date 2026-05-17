export function formatAuditTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function toDateStartIso(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00`).toISOString();
}

export function toDateEndIso(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}
