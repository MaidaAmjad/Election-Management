export default function CandidateProgressBars({ candidates, showMaskedVoterIds = false }) {
  if (!candidates.length) return null;

  return (
    <ul className="space-y-4">
      {candidates.map((c) => {
        const maskedIds = c.masked_voter_ids ?? [];
        const legacyVotes =
          showMaskedVoterIds && c.vote_count > 0 && maskedIds.length === 0;

        return (
          <li key={c.id}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-900">
                #{c.rank} {c.name}
              </span>
              <span className="text-slate-600">
                {c.vote_count} ({Number(c.vote_percentage).toFixed(1)}%)
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary-600 transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, c.vote_percentage)}%` }}
              />
            </div>
            {showMaskedVoterIds && maskedIds.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-slate-500">Masked voter IDs</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {maskedIds.map((maskedId) => (
                    <li
                      key={maskedId}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-xs text-slate-700"
                    >
                      {maskedId}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {legacyVotes && (
              <p className="mt-1.5 text-xs text-slate-500">
                Vote recorded before ID linkage was enabled (masked ID unavailable).
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
