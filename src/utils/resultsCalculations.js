function parseMaskedVoterIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseCandidates(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    designation: c.designation,
    photo_url: c.photo_url,
    manifesto: c.manifesto,
    vote_count: Number(c.vote_count ?? 0),
    vote_percentage: Number(c.vote_percentage ?? 0),
    rank: Number(c.rank ?? 0),
    masked_voter_ids: parseMaskedVoterIds(c.masked_voter_ids),
  }));
}

export function sortCandidatesByVotes(candidates) {
  return [...candidates].sort((a, b) => b.vote_count - a.vote_count);
}

export function formatTrendLabel(isoBucket) {
  if (!isoBucket) return '';
  const d = new Date(isoBucket);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildChartData(candidates) {
  return candidates.map((c) => ({
    name: c.name,
    votes: c.vote_count,
    percentage: c.vote_percentage,
  }));
}

export function buildTrendChartData(trend) {
  if (!Array.isArray(trend)) return [];
  return trend.map((row) => ({
    label: formatTrendLabel(row.bucket),
    votes: Number(row.vote_count ?? 0),
    cumulative: Number(row.cumulative ?? 0),
  }));
}
