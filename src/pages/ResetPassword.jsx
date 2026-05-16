import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineExclamationCircle, HiOutlineKey } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import RouteLoader from '../components/routing/RouteLoader';
import { useAuth } from '../hooks/useAuth';
import { getSession } from '../services/authService';
import { ROUTES } from '../utils/constants';
import {
  getUpdatePasswordErrorMessage,
  validateResetPasswordForm,
} from '../utils/passwordValidation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, logout, loading: authLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function verifyRecoverySession() {
      if (authLoading) return;

      try {
        const session = await getSession();
        if (!mounted) return;

        if (session) {
          setSessionReady(true);
        } else {
          setInvalidLink(true);
        }
      } catch {
        if (mounted) setInvalidLink(true);
      }
    }

    verifyRecoverySession();

    return () => {
      mounted = false;
    };
  }, [authLoading]);

  function validate() {
    const nextErrors = validateResetPasswordForm({ password, confirmPassword });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await updatePassword(password);
      await logout();
      toast.success('Password updated successfully. Sign in with your new password.');
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (error) {
      const message = getUpdatePasswordErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || (!sessionReady && !invalidLink)) {
    return <RouteLoader />;
  }

  if (invalidLink) {
    return (
      <AuthCard
        title="Invalid or expired link"
        subtitle="Request a new password reset link to continue"
        footer={
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Request new link
          </Link>
        }
      >
        <p className="text-center text-sm text-slate-600">
          This reset link may have expired or already been used. Password reset
          links are valid for a limited time.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set new password"
      subtitle="Choose a strong password for your account"
      footer={
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-primary-50 p-3 text-primary-600">
            <HiOutlineKey className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <HiOutlineExclamationCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <span>{formError}</span>
          </div>
        )}

        <Input
          id="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.password;
                return next;
              });
            }
            if (formError) setFormError('');
          }}
          error={errors.password}
          placeholder="At least 8 characters"
          disabled={isSubmitting}
        />

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (errors.confirmPassword) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.confirmPassword;
                return next;
              });
            }
            if (formError) setFormError('');
          }}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          disabled={isSubmitting}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  );
}
