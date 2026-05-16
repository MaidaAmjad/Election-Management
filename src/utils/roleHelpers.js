import { ROLE_DASHBOARD_ROUTES, ROUTES, USER_ROLES } from './constants';

export function getDashboardPathForRole(role) {
  return ROLE_DASHBOARD_ROUTES[role] ?? ROUTES.VOTER_DASHBOARD;
}

export function hasRole(role, allowedRoles) {
  if (!role || !allowedRoles?.length) return false;
  return allowedRoles.includes(role);
}

export function getRoleLabel(role) {
  const labels = {
    [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
    [USER_ROLES.ELECTION_CREATOR]: 'Election Creator',
    [USER_ROLES.VOTER]: 'Voter',
  };
  return labels[role] ?? 'User';
}
