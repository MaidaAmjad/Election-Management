import { ROUTES } from './constants';
import { USER_ROLES } from './constants';
import { CREATOR_REQUEST_STATUS } from './adminConstants';
import { normalizeRole } from './roleHelpers';

export function getCreatorDashboardPath(request) {
  if (!request) {
    return ROUTES.CREATOR_PENDING;
  }

  if (request.status === CREATOR_REQUEST_STATUS.APPROVED) {
    return ROUTES.CREATOR_DASHBOARD;
  }

  if (request.status === CREATOR_REQUEST_STATUS.REJECTED) {
    return ROUTES.CREATOR_REJECTED;
  }

  return ROUTES.CREATOR_PENDING;
}

export async function resolvePostAuthPath(role, creatorRequest) {
  const normalized = normalizeRole(role);

  if (normalized === USER_ROLES.ELECTION_CREATOR) {
    return getCreatorDashboardPath(creatorRequest);
  }

  if (normalized === USER_ROLES.SUPER_ADMIN) {
    return ROUTES.ADMIN_DASHBOARD;
  }

  if (normalized === USER_ROLES.VOTER) {
    return ROUTES.VOTER_DASHBOARD;
  }

  return ROUTES.HOME;
}
