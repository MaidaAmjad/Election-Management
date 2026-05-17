export default function CandidateResultsTable({ candidates }) {
  if (!candidates.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        No candidates for this election.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Rank</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Candidate</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Designation</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">Votes</th>
            <th className="px-4 py-3 text-right font-medium text-slate-600">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {candidates.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-mono font-semibold text-slate-700">#{c.rank}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {c.photo_url ? (
                    <img
                      src={c.photo_url}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-sm font-semibold">
                      {c.name?.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-slate-900">{c.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{c.designation}</td>
              <td className="px-4 py-3 text-right font-medium text-slate-900">
                {c.vote_count}
              </td>
              <td className="px-4 py-3 text-right text-slate-600">
                {Number(c.vote_percentage).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
