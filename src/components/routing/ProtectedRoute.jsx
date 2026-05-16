import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasRole } from '../../utils/roleHelpers';
import { ROUTES } from '../../utils/constants';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, profileLoading, role, isReady } = useAuth();
  const location = useLocation();

  if (loading || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (!isReady || !role) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  if (allowedRoles?.length && !hasRole(role, allowedRoles)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children;
}
