import { jsPDF } from 'jspdf';

function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportVotersToCsv(voters, electionTitle) {
  const headers = [
    'Voter Name',
    'Email',
    'Registration ID',
    'Registration Date',
    'Status',
  ];

  const rows = voters.map((v) => [
    v.voter_name,
    v.email,
    v.registration_id,
    v.registered_at,
    v.status,
  ]);

  const csv = [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(electionTitle)}-voters.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportVotersToPdf(voters, electionTitle) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const margin = 14;
  let y = margin;

  doc.setFontSize(16);
  doc.text(electionTitle || 'Voter List', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 8;

  const colWidths = [50, 55, 45, 45, 30];
  const headers = ['Name', 'Email', 'Reg. ID', 'Registered', 'Status'];

  doc.setFont(undefined, 'bold');
  let x = margin;
  headers.forEach((header, i) => {
    doc.text(header, x, y);
    x += colWidths[i];
  });
  y += 6;
  doc.setFont(undefined, 'normal');

  voters.forEach((voter) => {
    if (y > 190) {
      doc.addPage();
      y = margin;
    }

    const cells = [
      truncate(voter.voter_name, 28),
      truncate(voter.email, 32),
      truncate(String(voter.registration_id).slice(0, 8), 12),
      formatShortDate(voter.registered_at),
      voter.status,
    ];

    x = margin;
    cells.forEach((cell, i) => {
      doc.text(String(cell ?? ''), x, y);
      x += colWidths[i];
    });
    y += 6;
  });

  doc.save(`${sanitizeFilename(electionTitle)}-voters.pdf`);
}

function sanitizeFilename(name) {
  return (name || 'election')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function truncate(str, max) {
  const s = String(str ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function formatShortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString();
}

export function filterVoters(voters, { search, statusFilter }) {
  let result = [...voters];

  if (statusFilter && statusFilter !== 'all') {
    result = result.filter((v) => v.status === statusFilter);
  }

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (v) =>
        v.voter_name?.toLowerCase().includes(q) ||
        v.email?.toLowerCase().includes(q) ||
        String(v.registration_id).toLowerCase().includes(q),
    );
  }

  return result;
}

export function paginateItems(items, page, pageSize) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
  };
}
