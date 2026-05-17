import { ROUTES } from '../../utils/constants';
import SecretIdManagementPage from './SecretIdManagementPage';

export default function CreatorSecretIdManagementPage() {
  return <SecretIdManagementPage basePath={ROUTES.CREATOR_SECRET_IDS} />;
}
