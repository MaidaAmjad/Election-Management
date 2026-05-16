import { USER_ROLES } from './constants';
import { fetchLatestCreatorRequestByUserId } from '../services/creatorRequestService';
import { resolvePostAuthPath } from './creatorAccess';
import { normalizeRole } from './roleHelpers';

export async function getPostAuthDestination(role, userId) {
  const normalized = normalizeRole(role);

  if (normalized === USER_ROLES.ELECTION_CREATOR && userId) {
    const request = await fetchLatestCreatorRequestByUserId(userId);
    return resolvePostAuthPath(role, request);
  }

  return resolvePostAuthPath(role, null);
}
