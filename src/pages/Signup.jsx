import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineExclamationCircle } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import SelectedRoleBanner from '../components/auth/SelectedRoleBanner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';
import { validateSignupForm } from '../utils/signupValidation';
import { normalizePhone } from '../utils/validators';
import {
  getSelectedRole,
  isSignupAllowedForRole,
} from '../utils/roleStorage';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function Signup() {
  const navigate = useNavigate();
  const { signup, logout } = useAuth();
  const selectedRole = getSelectedRole();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedRole) {
      navigate(ROUTES.CHOOSE_ROLE, { replace: true });
      return;
    }
    if (!isSignupAllowedForRole(selectedRole)) {
      navigate(ROUTES.CHOOSE_ROLE, { replace: true });
      toast.error('Admin accounts are created by the system.');
    }
  }, [selectedRole, navigate]);

  if (!selectedRole || !isSignupAllowedForRole(selectedRole)) {
    return null;
  }

  function updateField(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
      if (formError) setFormError('');
    };
  }

  function validate() {
    const nextErrors = validateSignupForm(form);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { user } = await signup({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: normalizePhone(form.phone),
        role: selectedRole,
      });

      if (user?.identities?.length === 0) {
        setErrors({ email: 'An account with this email already exists.' });
        toast.error('An account with this email already exists.');
        return;
      }

      await logout();

      toast.success('Account created! Check your email to verify your account.');

      navigate(ROUTES.VERIFY_EMAIL, {
        replace: true,
        state: { email: form.email.trim() },
      });
    } catch (error) {
      const message = error.message ?? 'Failed to create account. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      className="max-w-lg"
      title="Create account"
      subtitle="Register for secure online elections"
      footer={
        <p className="text-slate-600">
          Already have an account?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mb-5 space-y-4">
        <Link
          to={ROUTES.CHOOSE_ROLE}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
        <SelectedRoleBanner role={selectedRole} mode="signup" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
          id="fullName"
          type="text"
          label="Full name"
          autoComplete="name"
          value={form.fullName}
          onChange={updateField('fullName')}
          error={errors.fullName}
          placeholder="Jane Doe"
          disabled={isSubmitting}
        />

        <Input
          id="email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={form.email}
          onChange={updateField('email')}
          error={errors.email}
          placeholder="you@example.com"
          disabled={isSubmitting}
        />

        <Input
          id="phone"
          type="tel"
          label="Phone number"
          autoComplete="tel"
          value={form.phone}
          onChange={updateField('phone')}
          error={errors.phone}
          placeholder="+1 555 123 4567"
          disabled={isSubmitting}
        />

        <Input
          id="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={updateField('password')}
          error={errors.password}
          placeholder="At least 8 characters"
          disabled={isSubmitting}
        />

        <Input
          id="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={updateField('confirmPassword')}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          disabled={isSubmitting}
        />

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Role is set from your selection and cannot be changed here. A
          verification email will be sent after sign up.
        </p>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
}
