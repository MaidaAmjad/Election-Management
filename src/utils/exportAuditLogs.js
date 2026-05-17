import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { formatAuditTimestamp } from './auditFormatters';

function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAuditLogsToCsv(logs, filename = 'audit-logs.csv') {
  const headers = ['Log ID', 'User', 'Role', 'Action', 'Module', 'Description', 'Timestamp'];
  const rows = logs.map((r) => [
    r.id,
    r.user_name,
    r.role,
    r.action_type,
    r.module_name,
    r.description,
    formatAuditTimestamp(r.created_at),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  downloadBlob(csv, 'text/csv;charset=utf-8;', filename);
}

export function exportAuditLogsToExcel(logs, filename = 'audit-logs.xlsx') {
  const data = [
    ['Log ID', 'User', 'Role', 'Action', 'Module', 'Description', 'Timestamp'],
    ...logs.map((r) => [
      r.id,
      r.user_name,
      r.role,
      r.action_type,
      r.module_name,
      r.description,
      formatAuditTimestamp(r.created_at),
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
  XLSX.writeFile(wb, filename);
}

export function exportAuditLogsToPdf(logs, title = 'Audit Logs Export') {
  const doc = new jsPDF({ orientation: 'landscape' });
  let y = 14;
  const margin = 12;

  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 8;
  doc.setFontSize(9);
  doc.text(`Generated: ${formatAuditTimestamp(new Date().toISOString())}`, margin, y);
  y += 8;

  logs.forEach((r) => {
    if (y > 190) {
      doc.addPage();
      y = margin;
    }
    doc.text(
      `${formatAuditTimestamp(r.created_at)} | ${r.user_name} (${r.role}) | ${r.action_type}`,
      margin,
      y,
    );
    y += 5;
    const lines = doc.splitTextToSize(r.description ?? '', 260);
    doc.text(lines, margin + 4, y);
    y += lines.length * 5 + 3;
  });

  doc.save('audit-logs.pdf');
}

export function exportSingleLogToCsv(log) {
  exportAuditLogsToCsv([log], `audit-log-${log.id?.slice(0, 8) ?? 'single'}.csv`);
}
