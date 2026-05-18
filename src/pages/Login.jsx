import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardPathForRole } from '../utils/roleHelpers';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineExclamationCircle } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import SelectedRoleBanner from '../components/auth/SelectedRoleBanner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, USER_ROLES } from '../utils/constants';
import {
  getAuthErrorMessage,
  validateLoginForm,
} from '../utils/loginValidation';
import { normalizeRole, profileHasRole } from '../utils/roleHelpers';
import { getPostAuthDestination } from '../utils/postAuthNavigation';
import { syncActiveProfileRole } from '../services/profileService';
import { registerAdditionalRole } from '../services/userRoleService';
import { formatRoleRegistrationError } from '../utils/authErrors';
import { getSelectedRole, isSignupAllowedForRole } from '../utils/roleStorage';

export default function Login() {
  const navigate = useNavigate();
  const {
    login,
    sendMfaOtp,
    logout,
    refreshProfile,
    user,
    isAuthenticated,
    isReady,
    role,
    profile,
    requiresMfa,
  } = useAuth();
  const selectedRole = getSelectedRole();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);

  useEffect(() => {
    if (!selectedRole) {
      navigate(ROUTES.CHOOSE_ROLE, { replace: true });
    }
  }, [selectedRole, navigate]);

  if (!selectedRole) {
    return null;
  }

  const canCreateAccount = isSignupAllowedForRole(selectedRole);
  const isSuperAdmin = selectedRole === USER_ROLES.SUPER_ADMIN;
  const selectedNormalized = normalizeRole(selectedRole);
  const hasSelectedRole =
    isAuthenticated && isReady && profileHasRole(profile, selectedRole);
  const activeRole = role ? normalizeRole(role) : null;
  const signedInWithoutSelectedRole =
    isAuthenticated && isReady && profile && !hasSelectedRole;
  const dashboardPath = hasSelectedRole
    ? getDashboardPathForRole(selectedNormalized)
    : null;

  async function handleContinueToDashboard() {
    if (!dashboardPath) return;
    if (requiresMfa) {
      navigate(ROUTES.VERIFY_MFA, {
        replace: true,
        state: { from: { pathname: dashboardPath } },
      });
      return;
    }
    navigate(dashboardPath, { replace: true });
  }

  async function handleSignOut() {
    await logout();
    setAuthError('');
    toast.success('Signed out. Enter your credentials to sign in.');
  }

  function handleGoToSignup() {
    navigate(ROUTES.SIGNUP);
  }

  async function handleAddRole() {
    if (!user?.id) {
      handleGoToSignup();
      return;
    }

    setIsAddingRole(true);
    setAuthError('');

    try {
      await registerAdditionalRole({
        role: selectedRole,
        fullName: profile?.full_name,
        phone: profile?.phone,
      });
      await syncActiveProfileRole(user.id, selectedRole);
      const updated = await refreshProfile();

      if (!profileHasRole(updated, selectedRole)) {
        throw new Error(formatRoleRegistrationError({ message: 'user_roles' }));
      }

      toast.success(`${selectedRole} role added to your account.`);

      const destination = await getPostAuthDestination(selectedNormalized, user.id);

      if (updated?.mfa_email_enabled) {
        await sendMfaOtp(user.email);
        navigate(ROUTES.VERIFY_MFA, {
          replace: true,
          state: { from: { pathname: destination }, otpSent: true },
        });
        return;
      }

      navigate(destination, { replace: true });
    } catch (error) {
      const message = formatRoleRegistrationError(error);
      setAuthError(message);
      toast.error(message);
    } finally {
      setIsAddingRole(false);
    }
  }

  function clearFieldError(field) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    if (authError) setAuthError('');
  }

  function validate() {
    const nextErrors = validateLoginForm({ email, password });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAuthError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { profile, user } = await login(email, password);

      if (!profile?.role) {
        setAuthError(
          'Your profile could not be loaded. Please contact support or try again.',
        );
        return;
      }

      if (!profileHasRole(profile, selectedRole)) {
        setAuthError(
          `This account does not have the ${selectedRole} role yet. Use Create account to add it with the same email and password.`,
        );
        toast.error('Role not registered on this account');
        return;
      }

      await syncActiveProfileRole(user.id, selectedRole);

      const destination = await getPostAuthDestination(selectedNormalized, user?.id);

      if (profile.mfa_email_enabled) {
        await sendMfaOtp(email);
        toast.success('Verification code sent to your email.');
        navigate(ROUTES.VERIFY_MFA, {
          replace: true,
          state: {
            from: { pathname: destination },
            otpSent: true,
          },
        });
        return;
      }

      toast.success('Welcome back!');
      navigate(destination, { replace: true });
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Access your election management account"
      footer={
        <div className="space-y-3 text-center text-sm">
          {canCreateAccount ? (
            <p className="text-slate-600">
              Don&apos;t have an account?{' '}
              <Link
                to={ROUTES.SIGNUP}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Create account
              </Link>
            </p>
          ) : isSuperAdmin ? (
            <p className="text-slate-500">
              Super Admin accounts are provisioned by the system. Contact your
              administrator if you need access.
            </p>
          ) : null}
          <p className="text-slate-500">
            <Link
              to={ROUTES.CHOOSE_ROLE}
              className="font-medium text-slate-600 hover:text-primary-700"
            >
              Choose a different role
            </Link>
          </p>
        </div>
      }
    >
      <div className="mb-5 space-y-4">
        <Link
          to={ROUTES.CHOOSE_ROLE}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to choose role
        </Link>
        <SelectedRoleBanner role={selectedRole} mode="login" />

        {canCreateAccount && (
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
            <p className="font-medium">Don&apos;t have an account?</p>
            <p className="mt-1 text-primary-800">
              {selectedRole === USER_ROLES.VOTER
                ? 'Register as a voter to join elections and cast votes securely.'
                : 'Register as an election creator. Admin approval is required after sign-up.'}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-3 w-full border-primary-200 bg-white hover:bg-primary-50"
              onClick={handleGoToSignup}
            >
              Create account
            </Button>
          </div>
        )}

        {hasSelectedRole && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-medium">
              You are already signed in as {profile?.full_name ?? 'this account'}.
            </p>
            <p className="mt-1 text-emerald-800">
              Continue to your dashboard or sign out to use a different account.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleContinueToDashboard}>
                Go to dashboard
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        )}

        {signedInWithoutSelectedRole && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {activeRole
              ? `You are signed in as ${activeRole} but have not added ${selectedRole} yet.`
              : `Add the ${selectedRole} role to this account.`}{' '}
            <Link to={ROUTES.CHOOSE_ROLE} className="font-semibold underline">
              choose another role
            </Link>
            .
            <div className="mt-3 flex flex-col gap-2">
              {canCreateAccount && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddRole}
                  isLoading={isAddingRole}
                  disabled={isAddingRole}
                >
                  Add {selectedRole} role
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleSignOut}
              >
                Sign out
              </Button>
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">First time signing in as Super Admin?</p>
            <p className="mt-1 text-amber-800">
              Bookmark{' '}
              <Link
                to={ROUTES.ADMIN_LOGIN}
                className="font-semibold underline hover:text-amber-950"
              >
                /admin/login
              </Link>{' '}
              on each device. If these credentials do not work, use{' '}
              <Link
                to={ROUTES.FORGOT_PASSWORD}
                className="font-semibold underline hover:text-amber-950"
              >
                Forgot password
              </Link>{' '}
              to set your password, then sign in again. In Supabase SQL Editor,
              run{' '}
              <code className="rounded bg-amber-100 px-1 text-xs">
                006_super_admin_maidaamjad.sql
              </code>{' '}
              so your role is Super Admin.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {authError && (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <HiOutlineExclamationCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <span>{authError}</span>
          </div>
        )}

        <Input
          id="email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError('email');
          }}
          error={errors.email}
          placeholder="you@example.com"
          disabled={isSubmitting}
        />

        <PasswordInput
          id="password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError('password');
          }}
          error={errors.password}
          placeholder="••••••••"
          disabled={isSubmitting}
        />

        <div className="flex justify-end">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  );
}
