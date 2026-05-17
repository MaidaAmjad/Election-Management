import { ROUTES } from '../../utils/constants';
import SecretIdElectionPage from './SecretIdElectionPage';

export default function AdminSecretIdElectionPage() {
  return <SecretIdElectionPage listPath={ROUTES.ADMIN_SECRET_IDS} />;
}
