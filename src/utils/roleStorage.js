import { USER_ROLES } from './constants';
import { normalizeRole } from './roleHelpers';

const SELECTED_ROLE_KEY = 'selectedRole';

export function getSelectedRole() {
  const stored = localStorage.getItem(SELECTED_ROLE_KEY);
  return normalizeRole(stored);
}

export function setSelectedRole(role) {
  const normalized = normalizeRole(role);
  if (!normalized) {
    localStorage.removeItem(SELECTED_ROLE_KEY);
    return;
  }
  localStorage.setItem(SELECTED_ROLE_KEY, normalized);
}

export function clearSelectedRole() {
  localStorage.removeItem(SELECTED_ROLE_KEY);
}

export function isSignupAllowedForRole(role) {
  return normalizeRole(role) !== USER_ROLES.SUPER_ADMIN;
}
