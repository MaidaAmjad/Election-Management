import {
  ROLE_DASHBOARD_ROUTES,
  ROLE_ROUTE_ACCESS,
  ROUTES,
  USER_ROLES,
} from './constants';

/** Maps legacy or metadata role values to canonical profile roles */
const ROLE_ALIASES = {
  voter: USER_ROLES.VOTER,
  Voter: USER_ROLES.VOTER,
  'election creator': USER_ROLES.ELECTION_CREATOR,
  election_creator: USER_ROLES.ELECTION_CREATOR,
  Election_Creator: USER_ROLES.ELECTION_CREATOR,
  'Election Creator': USER_ROLES.ELECTION_CREATOR,
  admin: USER_ROLES.SUPER_ADMIN,
  super_admin: USER_ROLES.SUPER_ADMIN,
  'Super Admin': USER_ROLES.SUPER_ADMIN,
  Super_Admin: USER_ROLES.SUPER_ADMIN,
};

export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return null;
  const trimmed = role.trim();
  if (ROLE_DASHBOARD_ROUTES[trimmed]) return trimmed;
  return ROLE_ALIASES[trimmed] ?? ROLE_ALIASES[trimmed.toLowerCase()] ?? null;
}

/**
 * Resolves role from profile first, then Supabase user metadata.
 */
export function resolveRole(profile, user) {
  const fromProfile = normalizeRole(profile?.role);
  if (fromProfile) return fromProfile;

  const fromMetadata = normalizeRole(user?.user_metadata?.role);
  if (fromMetadata) return fromMetadata;

  return null;
}

export function getDashboardPathForRole(role) {
  const normalized = normalizeRole(role);
  if (!normalized) return null;
  return ROLE_DASHBOARD_ROUTES[normalized] ?? null;
}

export function getAllowedRoutesForRole(role) {
  const normalized = normalizeRole(role);
  if (!normalized) return [];
  return ROLE_ROUTE_ACCESS[normalized] ?? [];
}

export function canAccessRoute(role, pathname) {
  const allowedRoutes = getAllowedRoutesForRole(role);
  return allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function hasRole(role, allowedRoles) {
  const normalized = normalizeRole(role);
  if (!normalized || !allowedRoles?.length) return false;
  return allowedRoles.some((allowed) => normalizeRole(allowed) === normalized);
}

export function getRoleLabel(role) {
  const normalized = normalizeRole(role);
  const labels = {
    [USER_ROLES.SUPER_ADMIN]: 'Super Admin',
    [USER_ROLES.ELECTION_CREATOR]: 'Election Creator',
    [USER_ROLES.VOTER]: 'Voter',
  };
  return labels[normalized] ?? 'User';
}
