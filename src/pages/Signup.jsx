import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, USER_ROLES } from '../utils/constants';
import { validateSignupForm } from '../utils/signupValidation';
import { normalizePhone } from '../utils/validators';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, signOut } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    };
  }

  function validate() {
    const nextErrors = validateSignupForm(form);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { user } = await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: normalizePhone(form.phone),
        role: USER_ROLES.VOTER,
      });

      if (user?.identities?.length === 0) {
        setErrors({ email: 'An account with this email already exists.' });
        toast.error('An account with this email already exists.');
        return;
      }

      await signOut();

      toast.success('Account created! Check your email to verify your account.');

      navigate(ROUTES.VERIFY_EMAIL, {
        replace: true,
        state: { email: form.email.trim() },
      });
    } catch (error) {
      toast.error(error.message ?? 'Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      className="max-w-lg"
      title="Create account"
      subtitle="Register as a voter to participate in secure online elections"
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
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="fullName"
            type="text"
            label="Full name"
            autoComplete="name"
            value={form.fullName}
            onChange={updateField('fullName')}
            error={errors.fullName}
            placeholder="Jane Doe"
            className="sm:col-span-2"
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
            className="sm:col-span-2"
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
            className="sm:col-span-2"
          />
        </div>

        <Input
          id="password"
          type="password"
          label="Password"
          autoComplete="new-password"
          value={form.password}
          onChange={updateField('password')}
          error={errors.password}
          placeholder="At least 8 characters"
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
        />

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Your account will be registered as a{' '}
          <span className="font-medium text-slate-700">Voter</span>. A
          verification email will be sent after sign up.
        </p>

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
