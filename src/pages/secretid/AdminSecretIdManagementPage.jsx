import { ROUTES } from '../../utils/constants';
import SecretIdManagementPage from './SecretIdManagementPage';

export default function AdminSecretIdManagementPage() {
  return <SecretIdManagementPage basePath={ROUTES.ADMIN_SECRET_IDS} />;
}
