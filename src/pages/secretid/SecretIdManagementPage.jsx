import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { useSecretIdElections } from '../../hooks/useSecretIdElections';
import { formatElectionDate } from '../../utils/electionFormatters';
import { hasRole } from '../../utils/roleHelpers';
import { USER_ROLES } from '../../utils/constants';

export default function SecretIdManagementPage({ basePath }) {
  const { user, role } = useAuth();
  const isAdmin = hasRole(role, [USER_ROLES.SUPER_ADMIN]);

  const { elections, loading, error } = useSecretIdElections({
    creatorId: user?.id,
    isAdmin,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Secret ID Management</h2>
        <p className="mt-1 text-slate-600">
          Generate and manage secret voting IDs for finalized elections.
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
          No finalized elections yet. Finalize a voter list first.
        </p>
      )}

      {!loading && elections.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {elections.map((election) => (
            <li
              key={election.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">{election.title}</h3>
              {election.finalized_at && (
                <p className="mt-2 text-sm text-slate-500">
                  Finalized {formatElectionDate(election.finalized_at)}
                </p>
              )}
              <Link
                to={`${basePath}/${election.id}`}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600"
              >
                Manage secret IDs
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
