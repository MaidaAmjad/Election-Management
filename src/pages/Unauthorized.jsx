import { Link } from 'react-router-dom';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import Button from '../components/ui/Button';
import { ROUTES } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { getDashboardPathForRole } from '../utils/roleHelpers';

export default function Unauthorized() {
  const { role, isAuthenticated, profile, user } = useAuth();
  const dashboardPath = getDashboardPathForRole(role);
  const missingProfile = isAuthenticated && !profile?.role && !role;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 inline-flex rounded-full bg-amber-50 p-4 text-amber-600">
        <HiOutlineExclamationTriangle className="h-10 w-10" aria-hidden="true" />
      </div>

      <h1 className="text-3xl font-bold text-slate-900">Access denied</h1>
      <p className="mt-3 max-w-md text-slate-600">
        {missingProfile ? (
          <>
            Your account is signed in but no valid profile role was found.
            Run the Supabase <code className="rounded bg-slate-100 px-1 text-sm">profiles</code> migration
            or contact an administrator to assign your role (
            <span className="font-medium">Super Admin</span>,{' '}
            <span className="font-medium">Election Creator</span>, or{' '}
            <span className="font-medium">Voter</span>).
          </>
        ) : (
          <>
            You do not have permission to view this page.
            {role && (
              <>
                {' '}
                Your role is <span className="font-medium">{role}</span>.
              </>
            )}
          </>
        )}
      </p>

      {user?.email && (
        <p className="mt-2 text-sm text-slate-500">Signed in as {user.email}</p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {dashboardPath ? (
          <Link to={dashboardPath}>
            <Button>Go to dashboard</Button>
          </Link>
        ) : (
          <Link to={ROUTES.LOGIN}>
            <Button>{isAuthenticated ? 'Sign in again' : 'Sign in'}</Button>
          </Link>
        )}
        <Link to={ROUTES.HOME}>
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
