import { HiOutlineTrophy } from 'react-icons/hi2';
import { RESULT_STATUS } from '../../utils/resultsConstants';

export default function WinnerCard({ election, winner, isTie, tiedCandidates }) {
  const showWinner =
    election?.status === 'Completed' ||
    election?.result_status === RESULT_STATUS.COMPLETED ||
    election?.result_status === RESULT_STATUS.LOCKED;

  if (!showWinner) return null;

  if (isTie && tiedCandidates?.length) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
        <h3 className="text-lg font-bold text-amber-900">Tie Detected</h3>
        <p className="mt-1 text-sm text-amber-800">
          Multiple candidates received the highest vote count.
        </p>
        <ul className="mt-4 space-y-3">
          {tiedCandidates.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg border border-amber-200 bg-white p-3"
            >
              {c.photo_url ? (
                <img
                  src={c.photo_url}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 font-semibold text-amber-800">
                  {c.name?.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-sm text-slate-600">
                  {c.vote_count} votes ({c.vote_percentage}%)
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!winner) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-800">
        <HiOutlineTrophy className="h-6 w-6" />
        <p className="text-sm font-semibold uppercase tracking-wide">Winner Declared</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {winner.photo_url ? (
          <img
            src={winner.photo_url}
            alt=""
            className="h-20 w-20 rounded-xl object-cover ring-2 ring-emerald-200"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-emerald-100 text-2xl font-bold text-emerald-800">
            {winner.name?.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-slate-900">{winner.name}</h3>
          {winner.designation && (
            <p className="text-slate-600">{winner.designation}</p>
          )}
          <p className="mt-2 text-sm font-medium text-emerald-800">
            {winner.vote_count} votes · {Number(winner.vote_percentage).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
