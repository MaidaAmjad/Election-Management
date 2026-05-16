import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';
import { getDashboardPathForRole } from '../../utils/roleHelpers';
import Spinner from '../ui/Spinner';

export default function GuestRoute({ children }) {
  const { isAuthenticated, loading, profileLoading, role, isReady } = useAuth();

  if (loading || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && isReady && !role) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  if (isAuthenticated && isReady && role) {
    return <Navigate to={getDashboardPathForRole(role)} replace />;
  }

  return children;
}
