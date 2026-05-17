import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

/** Legacy route — redirects to the audit & transparency module. */
export default function ActivityLogsPage() {
  return <Navigate to={ROUTES.ADMIN_AUDIT} replace />;
}
