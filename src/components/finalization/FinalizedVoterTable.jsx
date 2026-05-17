import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { formatElectionDate } from '../../utils/electionFormatters';

export default function FinalizedVoterTable({
  voters,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  pagination,
  onPageChange,
  onExportCsv,
  onExportPdf,
  isAdmin,
  onRemoveVoter,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium uppercase text-slate-500">
            Search
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name, email, or registration ID…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-slate-500">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All statuses' : opt}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onExportCsv}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={onExportPdf}>
            Export PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Voter name
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Registration ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Registration date
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              {isAdmin && (
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {pagination.items.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 6 : 5}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No voters match your filters.
                </td>
              </tr>
            ) : (
              pagination.items.map((voter) => (
                <tr key={voter.registration_id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {voter.voter_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{voter.email || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {voter.registration_id}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatElectionDate(voter.registered_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{voter.status}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => onRemoveVoter?.(voter)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{' '}
            voters)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
