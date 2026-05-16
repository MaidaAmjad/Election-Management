export const APP_NAME = 'Election Management';

export const ROUTES = {
  HOME: '/',
  CHOOSE_ROLE: '/choose-role',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_MFA: '/verify-mfa',
  SETTINGS: '/settings',
  ADMIN_DASHBOARD: '/admin-dashboard',
  CREATOR_DASHBOARD: '/creator-dashboard',
  VOTER_DASHBOARD: '/voter-dashboard',
  UNAUTHORIZED: '/unauthorized',
};

export const USER_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ELECTION_CREATOR: 'Election Creator',
  VOTER: 'Voter',
};

/** Routes each role is allowed to access */
export const ROLE_ROUTE_ACCESS = {
  [USER_ROLES.SUPER_ADMIN]: [ROUTES.ADMIN_DASHBOARD],
  [USER_ROLES.ELECTION_CREATOR]: [ROUTES.CREATOR_DASHBOARD],
  [USER_ROLES.VOTER]: [ROUTES.VOTER_DASHBOARD],
};

export const ROLE_DASHBOARD_ROUTES = {
  [USER_ROLES.SUPER_ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [USER_ROLES.ELECTION_CREATOR]: ROUTES.CREATOR_DASHBOARD,
  [USER_ROLES.VOTER]: ROUTES.VOTER_DASHBOARD,
};

export const PROTECTED_ROLES = [
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ELECTION_CREATOR,
  USER_ROLES.VOTER,
];
