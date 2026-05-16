export const APP_NAME = 'Election Management';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
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
