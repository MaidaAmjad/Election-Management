export const APP_NAME = 'Election Management';

export const ROUTES = {
  HOME: '/',
  PUBLIC_ELECTIONS: '/elections',
  ABOUT: '/about',
  CONTACT: '/contact',
  CHOOSE_ROLE: '/choose-role',
  ADMIN_LOGIN: '/admin/login',
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_MFA: '/verify-mfa',
  VERIFY_EMAIL: '/verify-email',
  SETTINGS: '/settings',
  ADMIN_NOTIFICATIONS: '/admin-dashboard/notifications',
  CREATOR_NOTIFICATIONS: '/creator-dashboard/notifications',
  VOTER_NOTIFICATIONS: '/voter-dashboard/notifications',
  ADMIN_DASHBOARD: '/admin-dashboard',
  ADMIN_REQUESTS: '/admin-dashboard/requests',
  ADMIN_ELECTION_REQUESTS: '/admin-dashboard/election-requests',
  ADMIN_APPROVED_ELECTIONS: '/admin-dashboard/approved-elections',
  ADMIN_FINALIZED_VOTERS: '/admin-dashboard/finalized-voters',
  ADMIN_SECRET_IDS: '/admin-dashboard/secret-ids',
  ADMIN_RESULTS: '/admin-dashboard/results',
  CREATOR_RESULTS: '/creator-dashboard/results',
  VOTER_RESULTS: '/voter-dashboard/results',
  CREATOR_FINALIZED_VOTERS: '/creator-dashboard/finalized-voters',
  CREATOR_SECRET_IDS: '/creator-dashboard/secret-ids',
  VOTER_SECRET_IDS: '/voter-dashboard/secret-ids',
  CREATOR_DASHBOARD: '/creator-dashboard',
  CREATOR_ELECTIONS: '/creator-dashboard/elections',
  CREATOR_CANDIDATES: '/creator-dashboard/candidates',
  CREATOR_PENDING: '/creator-dashboard/pending',
  CREATOR_REJECTED: '/creator-dashboard/rejected',
  VOTER_DASHBOARD: '/voter-dashboard',
  VOTER_JOINED_ELECTIONS: '/voter-dashboard/joined-elections',
  VOTER_VOTE: '/voter-dashboard/vote',
  VOTER_VOTING_HISTORY: '/voter-dashboard/voting-history',
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
