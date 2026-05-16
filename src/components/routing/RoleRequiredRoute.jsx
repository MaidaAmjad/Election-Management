import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';
import { getSelectedRole } from '../../utils/roleStorage';

/**
 * Ensures a role was chosen on the role selection page before login/signup.
 */
export default function RoleRequiredRoute({ children }) {
  const selectedRole = getSelectedRole();

  if (!selectedRole) {
    return <Navigate to={ROUTES.CHOOSE_ROLE} replace />;
  }

  return children;
}
