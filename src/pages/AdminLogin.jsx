import Login from './Login';
import { USER_ROLES } from '../utils/constants';
import { setSelectedRole } from '../utils/roleStorage';

/** Super Admin sign-in — works on any device without the choose-role screen. */
export default function AdminLogin() {
  setSelectedRole(USER_ROLES.SUPER_ADMIN);
  return <Login />;
}
