import { ROUTES } from '../../utils/constants';
import FinalizationElectionDetailPage from './FinalizationElectionDetailPage';

export default function AdminFinalizationDetailPage() {
  return (
    <FinalizationElectionDetailPage listPath={ROUTES.ADMIN_FINALIZED_VOTERS} />
  );
}
