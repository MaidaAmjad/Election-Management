import { ROUTES } from '../../utils/constants';
import FinalizationElectionDetailPage from './FinalizationElectionDetailPage';

export default function CreatorFinalizationDetailPage() {
  return (
    <FinalizationElectionDetailPage
      listPath={ROUTES.CREATOR_FINALIZED_VOTERS}
    />
  );
}
