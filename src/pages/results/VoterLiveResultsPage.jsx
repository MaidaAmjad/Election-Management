import { ROUTES } from '../../utils/constants';
import LiveResultsPage from './LiveResultsPage';

export default function VoterLiveResultsPage() {
  return <LiveResultsPage listPath={ROUTES.VOTER_RESULTS} />;
}
