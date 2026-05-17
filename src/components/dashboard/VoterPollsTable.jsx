import { Link } from 'react-router-dom';
import { HiOutlineEye, HiOutlineChartBar, HiOutlineHandRaised } from 'react-icons/hi2';
import { ROUTES } from '../../utils/constants';
import { formatElectionDate } from '../../utils/electionFormatters';

const STATUS_STYLES = {
  'Not Started': 'bg-slate-100 text-slate-700',
  Active: 'bg-emerald-100 text-emerald-800',
  Voted: 'bg-blue-100 text-blue-800',
  Completed: 'bg-violet-100 text-violet-800',
};

export default function VoterPollsTable({ polls }) {
  if (!polls?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No joined polls match your filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Poll',
                'Election',
                'Registration',
                'Voting status',
                'Election date',
                'Actions',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {polls.map((row) => (
              <tr key={row.poll_id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{row.poll_title}</td>
                <td className="px-4 py-3 text-slate-600">{row.election_title}</td>
                <td className="px-4 py-3 text-slate-600">{row.registration_status}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      STATUS_STYLES[row.voting_status] ?? STATUS_STYLES['Not Started']
                    }`}
                  >
                    {row.voting_status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatElectionDate(row.start_datetime)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Link
                      to={`${ROUTES.VOTER_VOTE}/${row.election_id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50"
                    >
                      <HiOutlineEye className="h-4 w-4" /> View
                    </Link>
                    {row.voting_status === 'Active' && (
                      <Link
                        to={`${ROUTES.VOTER_VOTE}/${row.election_id}/${row.poll_id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        <HiOutlineHandRaised className="h-4 w-4" /> Vote
                      </Link>
                    )}
                    {row.voting_status === 'Completed' && (
                      <Link
                        to={`${ROUTES.VOTER_RESULTS}/${row.election_id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
                      >
                        <HiOutlineChartBar className="h-4 w-4" /> Results
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
