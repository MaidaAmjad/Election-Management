import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';
import RouteLoader from './RouteLoader';

/**
 * Blocks unauthenticated users and redirects them to the login page.
 * Preserves the attempted URL so the user can return after signing in.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoader />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={ROUTES.CHOOSE_ROLE} state={{ from: location }} replace />
    );
  }

  return children;
}
