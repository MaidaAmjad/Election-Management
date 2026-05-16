import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';
import { canAccessRoute, hasRole } from '../../utils/roleHelpers';
import RouteLoader from './RouteLoader';

/**
 * Restricts access by role. Must be nested inside ProtectedRoute.
 */
export default function RoleProtectedRoute({ children, allowedRoles }) {
  const { profileLoading, role, isReady, user } = useAuth();
  const location = useLocation();

  if (profileLoading || (user && !isReady)) {
    return <RouteLoader />;
  }

  if (!role) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  if (allowedRoles?.length && !hasRole(role, allowedRoles)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  if (!canAccessRoute(role, location.pathname)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children;
}
