import ResultsHistoryTable from '../../components/results/ResultsHistoryTable';
import { useResultsHistory } from '../../hooks/useResultsHistory';
import { RESULT_STATUS } from '../../utils/resultsConstants';

export default function ResultsHistoryPage({ detailPath }) {
  const history = useResultsHistory();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Election Results History</h2>
        <p className="mt-1 text-slate-600">
          Browse past and current election outcomes, turnout, and winners.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium uppercase text-slate-500">
            Search
          </label>
          <input
            type="search"
            value={history.search}
            onChange={(e) => history.setSearch(e.target.value)}
            placeholder="Election title, category, winner…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-slate-500">
            Category
          </label>
          <select
            value={history.category}
            onChange={(e) => history.setCategory(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            {history.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-slate-500">
            Result status
          </label>
          <select
            value={history.status}
            onChange={(e) => history.setStatus(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value={RESULT_STATUS.PROCESSING}>Processing</option>
            <option value={RESULT_STATUS.COMPLETED}>Completed</option>
            <option value={RESULT_STATUS.LOCKED}>Locked</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-slate-500">
            Sort
          </label>
          <select
            value={history.sortBy}
            onChange={(e) => history.setSortBy(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="votes_desc">Most votes</option>
            <option value="turnout_desc">Highest turnout</option>
            <option value="title_asc">Title A–Z</option>
          </select>
        </div>
      </div>

      <ResultsHistoryTable
        rows={history.paginated}
        loading={history.loading}
        error={history.error}
        page={history.page}
        totalPages={history.totalPages}
        totalFiltered={history.filtered.length}
        onPageChange={history.setPage}
        detailPath={detailPath}
      />
    </div>
  );
}
