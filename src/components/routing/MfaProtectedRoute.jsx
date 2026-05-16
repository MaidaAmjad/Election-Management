import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../utils/constants';
import RouteLoader from './RouteLoader';

/**
 * Blocks access until email OTP is verified when MFA is enabled on the profile.
 * Must be nested inside ProtectedRoute.
 */
export default function MfaProtectedRoute({ children }) {
  const { requiresMfa, profileLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated && profileLoading) {
    return <RouteLoader />;
  }

  if (requiresMfa) {
    return (
      <Navigate
        to={ROUTES.VERIFY_MFA}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}
