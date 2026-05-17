import { ROUTES } from '../../utils/constants';
import LiveResultsPage from './LiveResultsPage';

export default function AdminLiveResultsPage() {
  return <LiveResultsPage listPath={ROUTES.ADMIN_RESULTS} />;
}
