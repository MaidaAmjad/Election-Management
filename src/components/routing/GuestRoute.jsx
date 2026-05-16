import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';
import { getDashboardPathForRole } from '../../utils/roleHelpers';
import RouteLoader from './RouteLoader';

export default function GuestRoute({ children }) {
  const {
    isAuthenticated,
    loading,
    profileLoading,
    role,
    isReady,
    requiresMfa,
  } = useAuth();

  if (loading || (isAuthenticated && profileLoading)) {
    return <RouteLoader />;
  }

  if (isAuthenticated && isReady && !role) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  if (isAuthenticated && isReady && requiresMfa) {
    return <Navigate to={ROUTES.VERIFY_MFA} replace />;
  }

  if (isAuthenticated && isReady && role) {
    return <Navigate to={getDashboardPathForRole(role)} replace />;
  }

  return children;
}
