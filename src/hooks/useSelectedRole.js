import { useCallback, useSyncExternalStore } from 'react';
import {
  clearSelectedRole,
  getSelectedRole,
  setSelectedRole,
} from '../utils/roleStorage';

function subscribe(callback) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  return getSelectedRole();
}

export function useSelectedRole() {
  const selectedRole = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const selectRole = useCallback((role) => {
    setSelectedRole(role);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const clearRole = useCallback(() => {
    clearSelectedRole();
    window.dispatchEvent(new Event('storage'));
  }, []);

  return { selectedRole, selectRole, clearRole };
}
