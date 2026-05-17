import { Link } from 'react-router-dom';
import { HiOutlineTrophy } from 'react-icons/hi2';

export default function ResultsSummaryCards({ items, resultsBasePath, emptyMessage }) {
  if (!items?.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        {emptyMessage ?? 'No results to display yet.'}
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-900">{item.title}</h4>
              <p className="mt-1 flex items-center gap-1 text-sm text-emerald-700">
                <HiOutlineTrophy className="h-4 w-4" />
                {item.winner_name ?? 'Pending'}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {item.result_status ?? '—'}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-slate-500">Votes</dt>
              <dd className="font-semibold text-slate-900">
                {Number(item.total_votes ?? 0).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Turnout</dt>
              <dd className="font-semibold text-slate-900">
                {item.turnout_percentage != null
                  ? `${Number(item.turnout_percentage).toFixed(1)}%`
                  : '—'}
              </dd>
            </div>
          </dl>
          {resultsBasePath && (
            <Link
              to={`${resultsBasePath}/${item.id}`}
              className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View full results →
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}
