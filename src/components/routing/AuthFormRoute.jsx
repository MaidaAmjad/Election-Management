import { useAuth } from '../../hooks/useAuth';
import RouteLoader from './RouteLoader';

/**
 * Login and sign-up must always render — never skip to the dashboard when a
 * session already exists (e.g. after "Continue to sign in" on role selection).
 */
export default function AuthFormRoute({ children }) {
  const { loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  return children;
}
