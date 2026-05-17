export default function LiveVoteStats({ participation, voteCounts, candidateCount }) {
  const votesCast = participation?.votes_cast ?? 0;
  const registered = participation?.registered_voters ?? 0;
  const totalBallotVotes = (voteCounts ?? []).reduce(
    (sum, row) => sum + Number(row.vote_count ?? 0),
    0,
  );

  const turnout =
    registered > 0 ? Math.round((votesCast / registered) * 100) : 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Votes cast (election)" value={String(votesCast)} />
      <Stat label="Registered voters" value={String(registered)} />
      <Stat label="Turnout" value={`${turnout}%`} />
      {candidateCount > 0 && (
        <Stat
          label="Votes on this poll"
          value={String(totalBallotVotes)}
          className="sm:col-span-3"
        />
      )}
    </div>
  );
}

function Stat({ label, value, className = '' }) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 ${className}`}
    >
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
