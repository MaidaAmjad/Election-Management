import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { getSelectedRole, isSignupAllowedForRole } from '../../utils/roleStorage';

/**
 * Signup is only for Election Creator and Voter (after role selection + login path).
 */
export default function SignupAllowedRoute({ children }) {
  const selectedRole = getSelectedRole();

  if (!selectedRole) {
    return <Navigate to={ROUTES.CHOOSE_ROLE} replace />;
  }

  if (!isSignupAllowedForRole(selectedRole)) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
}
