export default function CandidateProgressBars({ candidates }) {
  if (!candidates.length) return null;

  return (
    <ul className="space-y-4">
      {candidates.map((c) => (
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
        </li>
      ))}
    </ul>
  );
}
