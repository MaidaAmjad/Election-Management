import { Link } from 'react-router-dom';
import { HiOutlineExclamationTriangle } from 'react-icons/hi2';
import Button from '../components/ui/Button';
import { ROUTES } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { getDashboardPathForRole } from '../utils/roleHelpers';

export default function Unauthorized() {
  const { role, isAuthenticated } = useAuth();
  const dashboardPath =
    isAuthenticated && role ? getDashboardPathForRole(role) : ROUTES.LOGIN;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 inline-flex rounded-full bg-amber-50 p-4 text-amber-600">
        <HiOutlineExclamationTriangle className="h-10 w-10" aria-hidden="true" />
      </div>

      <h1 className="text-3xl font-bold text-slate-900">Access denied</h1>
      <p className="mt-3 max-w-md text-slate-600">
        You do not have permission to view this page. Contact your administrator
        if you believe this is an error.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link to={dashboardPath}>
          <Button>
            {isAuthenticated ? 'Go to dashboard' : 'Sign in'}
          </Button>
        </Link>
        <Link to={ROUTES.HOME}>
          <Button variant="secondary">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
