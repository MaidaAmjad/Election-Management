import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';
import { isValidEmail } from '../utils/validators';

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email);
      setEmailSent(true);
      toast.success('Password reset link sent to your email.');
    } catch (err) {
      toast.error(err.message ?? 'Failed to send reset email. Please try again.');
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
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-full bg-primary-50 p-4 text-primary-600">
            <HiOutlineEnvelope className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-600">
            If an account exists for <strong>{email}</strong>, you will receive
            instructions to reset your password shortly.
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
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
        <Input
          id="email"
          type="email"
          label="Email address"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          placeholder="you@example.com"
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}
