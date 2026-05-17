import { Navigate } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

/** Candidates are managed inside the election wizard — no global module. */
export default function CandidateModuleRedirect() {
  return <Navigate to={ROUTES.CREATOR_ELECTIONS} replace />;
}
