import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';
import { ROUTES } from '../utils/constants';

/**
 * Signs out, clears session state, shows feedback, and redirects to login.
 */
export function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      await logout();
      toast.success('You have been signed out.');
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      toast.error(error?.message ?? 'Failed to sign out. Please try again.');
    }
  }, [logout, navigate]);
}
