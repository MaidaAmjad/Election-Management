import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineExclamationCircle } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';
import {
  getAuthErrorMessage,
  validateLoginForm,
} from '../utils/loginValidation';
import { getDashboardPathForRole } from '../utils/roleHelpers';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const { profile } = await signIn(email, password);

      if (!profile?.role) {
        setAuthError(
          'Your profile could not be loaded. Please contact support or try again.',
        );
        return;
      }

      toast.success('Welcome back!');
      navigate(getDashboardPathForRole(profile.role), { replace: true });
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
        <p className="text-slate-600">
          Don&apos;t have an account?{' '}
          <Link
            to={ROUTES.SIGNUP}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Create one
          </Link>
        </p>
      }
    >
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

        <Input
          id="password"
          type="password"
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
