import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import RegistrationStatusBadge from '../../components/finalization/RegistrationStatusBadge';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useFinalizationElections } from '../../hooks/useFinalizationElections';
import { formatElectionDate } from '../../utils/electionFormatters';
import { hasRole } from '../../utils/roleHelpers';
import { USER_ROLES } from '../../utils/constants';

export default function FinalizedVotersPage({ basePath }) {
  const { user, role } = useAuth();
  const isAdmin = hasRole(role, [USER_ROLES.SUPER_ADMIN]);

  const { elections, loading, error } = useFinalizationElections({
    creatorId: user?.id,
    isAdmin,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Finalized Voters</h2>
        <p className="mt-1 text-slate-600">
          Manage registration locks, finalize voter lists, and export records.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && elections.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
          No published elections available.
        </p>
      )}

      {!loading && elections.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {elections.map((election) => (
            <li
              key={election.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{election.title}</h3>
                <RegistrationStatusBadge status={election.registration_status} />
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Total voters</dt>
                  <dd className="font-medium text-slate-900">
                    {election.registered_count} / {election.max_voters}
                  </dd>
                </div>
                {election.locked_at && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Locked</dt>
                    <dd className="text-slate-900">
                      {formatElectionDate(election.locked_at)}
                    </dd>
                  </div>
                )}
                {election.finalized_at && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Finalized</dt>
                    <dd className="text-slate-900">
                      {formatElectionDate(election.finalized_at)}
                    </dd>
                  </div>
                )}
              </dl>
              <Link
                to={`${basePath}/${election.id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Manage
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
