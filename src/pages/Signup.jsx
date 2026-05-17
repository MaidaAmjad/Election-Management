import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineExclamationCircle } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import SelectedRoleBanner from '../components/auth/SelectedRoleBanner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PasswordInput from '../components/ui/PasswordInput';
import Textarea from '../components/ui/Textarea';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, USER_ROLES } from '../utils/constants';
import { validateSignupForm } from '../utils/signupValidation';
import { validateCreatorRequestFields } from '../utils/creatorRequestValidation';
import { createCreatorRequest } from '../services/creatorRequestService';
import { sendSignupVerificationEmail } from '../services/notificationService';
import { getPostAuthDestination } from '../utils/postAuthNavigation';
import { normalizePhone } from '../utils/validators';
import { getSelectedRole } from '../utils/roleStorage';
import { normalizeRole } from '../utils/roleHelpers';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  organization: '',
  purpose: '',
};

export default function Signup() {
  const navigate = useNavigate();
  const { signup, sendMfaOtp } = useAuth();
  const selectedRole = getSelectedRole();
  const isCreatorSignup =
    normalizeRole(selectedRole) === USER_ROLES.ELECTION_CREATOR;

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedRole) {
      navigate(ROUTES.CHOOSE_ROLE, { replace: true });
    }
  }, [selectedRole, navigate]);

  if (!selectedRole) {
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
    const nextErrors = {
      ...validateSignupForm(form),
      ...(isCreatorSignup ? validateCreatorRequestFields(form) : {}),
    };
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { user, profile, requiresMfa } = await signup({
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

      if (!profile?.role) {
        setFormError(
          'Your profile could not be loaded. Please sign in or contact support.',
        );
        return;
      }

      const actualRole = normalizeRole(profile.role);
      if (actualRole !== selectedRole) {
        setFormError('Account role mismatch. Please contact support.');
        return;
      }

      if (isCreatorSignup) {
        await createCreatorRequest({
          userId: user.id,
          purpose: form.purpose,
          email: form.email,
          phone: normalizePhone(form.phone),
          organization: form.organization,
        });
        toast.success(
          'Account created! Your election creator request is pending admin approval.',
        );
      }

      const destination = await getPostAuthDestination(actualRole, user?.id);

      try {
        await sendSignupVerificationEmail({
          email: form.email,
          userId: user.id,
          fullName: form.fullName,
        });
      } catch (emailErr) {
        console.warn('[Signup] Verification email:', emailErr?.message);
      }

      if (requiresMfa) {
        await sendMfaOtp(form.email);
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

      if (!user.email_confirmed_at) {
        toast.success('Account created! Check your email to verify your address.');
        navigate(ROUTES.VERIFY_EMAIL, { replace: true });
        return;
      }

      if (!isCreatorSignup) {
        toast.success('Account created! Welcome.');
      }

      navigate(destination, { replace: true });
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
        <p className="text-center text-slate-600">
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
          to={ROUTES.LOGIN}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
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

        {isCreatorSignup && (
          <>
            <Input
              id="organization"
              type="text"
              label="Organization name"
              value={form.organization}
              onChange={updateField('organization')}
              error={errors.organization}
              placeholder="Your school, club, or organization"
              disabled={isSubmitting}
            />
            <Textarea
              id="purpose"
              label="Purpose of election"
              value={form.purpose}
              onChange={updateField('purpose')}
              error={errors.purpose}
              rows={4}
              placeholder="Describe the elections you plan to run and why you need creator access"
              disabled={isSubmitting}
            />
          </>
        )}

        <PasswordInput
          id="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={updateField('password')}
          error={errors.password}
          placeholder="At least 8 characters"
          disabled={isSubmitting}
        />

        <PasswordInput
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={updateField('confirmPassword')}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          disabled={isSubmitting}
        />

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          {isCreatorSignup
            ? 'Election Creator access requires Super Admin approval after sign-up. You will be notified by email when your request is reviewed.'
            : 'Role is set from your selection. Sign in immediately after creating your account with email and password.'}
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
