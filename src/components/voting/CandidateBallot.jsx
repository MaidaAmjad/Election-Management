import CandidateVoteCard from './CandidateVoteCard';

export default function CandidateBallot({
  candidates,
  selectedId,
  onSelect,
  disabled,
  voteCounts,
}) {
  const countMap = Object.fromEntries(
    (voteCounts ?? []).map((c) => [c.candidate_id, c.vote_count]),
  );

  if (!candidates?.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No candidates are available for this election yet.
      </p>
    );
  }

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="text-lg font-semibold text-slate-900">Select a candidate</legend>
      <div className="grid gap-4 sm:grid-cols-2">
        {candidates.map((candidate) => (
          <CandidateVoteCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedId === candidate.id}
            onSelect={() => onSelect(candidate.id)}
            voteCount={countMap[candidate.id]}
            showCounts={Boolean(voteCounts?.length)}
          />
        ))}
      </div>
    </fieldset>
  );
}
