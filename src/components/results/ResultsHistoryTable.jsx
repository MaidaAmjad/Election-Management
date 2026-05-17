import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { formatElectionDate } from '../../utils/electionFormatters';

export default function ResultsHistoryTable({
  rows,
  loading,
  error,
  page,
  totalPages,
  totalFiltered,
  onPageChange,
  detailPath,
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
        No election results match your filters.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Election</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Winner</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Votes</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Turnout</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Result date</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
                <td className="px-4 py-3 text-slate-600">{row.category}</td>
                <td className="px-4 py-3 text-slate-600">
                  {row.winner?.name ?? (row.result_status === 'Locked' ? '—' : 'Pending')}
                </td>
                <td className="px-4 py-3 text-right text-slate-900">{row.total_votes ?? 0}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {row.turnout_percentage != null
                    ? `${Number(row.turnout_percentage).toFixed(1)}%`
                    : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.result_date ? formatElectionDate(row.result_date) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`${detailPath}/${row.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary-600"
                  >
                    View
                    <HiOutlineArrowRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <p>
            Page {page} of {totalPages} ({totalFiltered} elections)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
