import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sanitizeFilename(name) {
  return (name || 'election-results').replace(/[^\w\-]+/g, '-').slice(0, 80);
}

export function exportResultsToCsv(payload) {
  const { election, candidates, turnout, winner, isTie, tiedCandidates } = payload;
  const generated = new Date().toLocaleString();

  const lines = [
    ['Election Results Export'],
    ['Election', election?.title],
    ['Category', election?.category],
    ['Generated', generated],
    ['Result Status', election?.result_status],
    ['Turnout %', turnout?.turnout_percentage ?? election?.turnout_percentage],
    ['Registered Voters', turnout?.registered_voters],
    ['Total Votes Cast', turnout?.total_votes_cast],
    ['Winner', isTie ? 'Tie Detected' : winner?.name ?? '—'],
    [],
    ['Rank', 'Candidate', 'Designation', 'Votes', 'Percentage'],
    ...candidates.map((c) => [
      c.rank,
      c.name,
      c.designation,
      c.vote_count,
      `${c.vote_percentage}%`,
    ]),
  ];

  if (isTie && tiedCandidates?.length) {
    lines.push([], ['Tied Candidates'], ...tiedCandidates.map((c) => [c.name, c.vote_count]));
  }

  const csv = lines.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  downloadBlob(
    csv,
    'text/csv;charset=utf-8;',
    `${sanitizeFilename(election?.title)}-results.csv`,
  );
}

export function exportResultsToExcel(payload) {
  const { election, candidates, turnout, winner, isTie } = payload;
  const summary = [
    ['Election', election?.title],
    ['Category', election?.category],
    ['Generated', new Date().toLocaleString()],
    ['Turnout %', turnout?.turnout_percentage ?? election?.turnout_percentage],
    ['Registered', turnout?.registered_voters],
    ['Votes Cast', turnout?.total_votes_cast],
    ['Winner', isTie ? 'Tie' : winner?.name ?? '—'],
  ];
  const sheetData = [
    ...summary,
    [],
    ['Rank', 'Candidate', 'Designation', 'Votes', '%'],
    ...candidates.map((c) => [
      c.rank,
      c.name,
      c.designation,
      c.vote_count,
      c.vote_percentage,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, `${sanitizeFilename(election?.title)}-results.xlsx`);
}

export function exportResultsToPdf(payload) {
  const { election, candidates, turnout, winner, isTie } = payload;
  const doc = new jsPDF();
  let y = 14;
  const margin = 14;

  doc.setFontSize(16);
  doc.text(election?.title ?? 'Election Results', margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 6;
  doc.text(`Turnout: ${turnout?.turnout_percentage ?? 0}%`, margin, y);
  y += 6;
  doc.text(
    `Votes cast: ${turnout?.total_votes_cast ?? 0} / Registered: ${turnout?.registered_voters ?? 0}`,
    margin,
    y,
  );
  y += 8;

  if (isTie) {
    doc.setFont(undefined, 'bold');
    doc.text('Tie Detected', margin, y);
    y += 8;
    doc.setFont(undefined, 'normal');
  } else if (winner?.name) {
    doc.text(`Winner: ${winner.name} (${winner.vote_count} votes)`, margin, y);
    y += 8;
  }

  doc.setFont(undefined, 'bold');
  doc.text('Candidate Results', margin, y);
  y += 6;
  doc.setFont(undefined, 'normal');

  candidates.forEach((c) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    doc.text(
      `#${c.rank} ${c.name} — ${c.vote_count} votes (${c.vote_percentage}%)`,
      margin,
      y,
    );
    y += 6;
  });

  doc.save(`${sanitizeFilename(election?.title)}-results.pdf`);
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
