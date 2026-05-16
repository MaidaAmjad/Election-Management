import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineExclamationCircle } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';
import {
  getPasswordResetErrorMessage,
  validateForgotPasswordForm,
} from '../utils/passwordValidation';

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  function validate() {
    const nextErrors = validateForgotPasswordForm({ email });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      setEmailSent(true);
      toast.success('Password reset link sent. Check your email.');
    } catch (error) {
      const message = getPasswordResetErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (emailSent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="We sent a password reset link to your inbox"
        footer={
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto inline-flex rounded-full bg-primary-50 p-4 text-primary-600">
            <HiOutlineEnvelope className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-600">
            If an account exists for{' '}
            <strong className="font-medium text-slate-900">{email}</strong>, you
            will receive a link to reset your password shortly.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your email and we will send you a reset link"
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
          id="email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              setErrors((prev) => {
                const next = { ...prev };
                delete next.email;
                return next;
              });
            }
            if (formError) setFormError('');
          }}
          error={errors.email}
          placeholder="you@example.com"
          disabled={isSubmitting}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending link…' : 'Send reset link'}
        </Button>
      </form>
    </AuthCard>
  );
}
