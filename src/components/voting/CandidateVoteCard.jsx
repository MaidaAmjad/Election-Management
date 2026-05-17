export default function CandidateVoteCard({
  candidate,
  selected,
  onSelect,
  voteCount,
  showCounts,
}) {
  const manifestoPreview =
    candidate.manifesto?.length > 160
      ? `${candidate.manifesto.slice(0, 160)}…`
      : candidate.manifesto;

  return (
    <label
      className={[
        'flex cursor-pointer gap-4 rounded-xl border p-4 transition-colors',
        selected
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/30'
          : 'border-slate-200 bg-white hover:border-slate-300',
      ].join(' ')}
    >
      <input
        type="radio"
        name="candidate"
        className="mt-1 h-4 w-4 shrink-0 border-slate-300 text-primary-600 focus:ring-primary-500"
        checked={selected}
        onChange={onSelect}
      />
      <div className="min-w-0 flex-1">
        <div className="flex gap-3">
          {candidate.photo_url ? (
            <img
              src={candidate.photo_url}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-sm font-semibold text-slate-600">
              {candidate.name?.charAt(0) ?? '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">{candidate.name}</p>
            <p className="text-sm text-slate-600">{candidate.designation}</p>
            {showCounts && voteCount != null && (
              <p className="mt-1 text-xs font-medium text-primary-700">
                {voteCount} vote{voteCount === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </div>
        {manifestoPreview && (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{manifestoPreview}</p>
        )}
      </div>
    </label>
  );
}
