import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineInboxArrowDown } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import { resendVerificationEmail } from '../services/authService';
import { ROUTES } from '../utils/constants';

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email ?? '';

  const [isResending, setIsResending] = useState(false);

  if (!email) {
    return <Navigate to={ROUTES.SIGNUP} replace />;
  }

  async function handleResend() {
    setIsResending(true);
    try {
      await resendVerificationEmail(email);
      toast.success('Verification email sent again.');
    } catch (error) {
      toast.error(
        error.message ?? 'Could not resend email. Please try again later.',
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <AuthCard
      className="max-w-lg"
      title="Verify your email"
      subtitle="One more step before you can sign in"
      footer={
        <p className="text-slate-600">
          Wrong email?{' '}
          <Link
            to={ROUTES.SIGNUP}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Go back to sign up
          </Link>
        </p>
      }
    >
      <div className="space-y-6 text-center">
        <div className="mx-auto inline-flex rounded-full bg-primary-50 p-4 text-primary-600">
          <HiOutlineEnvelope className="h-10 w-10" aria-hidden="true" />
        </div>

        <p className="text-sm leading-relaxed text-slate-600">
          We sent a verification link to{' '}
          <strong className="font-medium text-slate-900">{email}</strong>.
          Open the email and click the link to activate your account.
        </p>

        <ol className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700">
          <li className="flex gap-3">
            <HiOutlineInboxArrowDown
              className="mt-0.5 h-5 w-5 shrink-0 text-primary-600"
              aria-hidden="true"
            />
            <span>Check your inbox (and spam or junk folder).</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              2
            </span>
            <span>Click the confirmation link in the email.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              3
            </span>
            <span>Return here and sign in with your new account.</span>
          </li>
        </ol>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to={ROUTES.LOGIN} className="w-full sm:w-auto">
            <Button className="w-full">Go to sign in</Button>
          </Link>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={handleResend}
            isLoading={isResending}
          >
            Resend verification email
          </Button>
        </div>
      </div>
    </AuthCard>
  );
}
