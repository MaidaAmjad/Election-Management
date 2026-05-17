import TurnoutRing from '../../charts/TurnoutRing';

export default function TurnoutStats({ turnout, election }) {
  const pct =
    turnout?.turnout_percentage ?? election?.turnout_percentage ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Voter turnout</h3>
      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
        <TurnoutRing percentage={pct} />
        <dl className="grid w-full max-w-sm gap-3 text-sm sm:grid-cols-1">
          <Stat label="Total registered voters" value={turnout?.registered_voters ?? 0} />
          <Stat label="Total votes cast" value={turnout?.total_votes_cast ?? 0} />
          <Stat label="Unique voters participated" value={turnout?.unique_voters_voted ?? 0} />
          <Stat label="Turnout percentage" value={`${Number(pct).toFixed(1)}%`} />
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
