import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineExclamationCircle, HiOutlineShieldCheck } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import RouteLoader from '../components/routing/RouteLoader';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../utils/constants';
import { getMfaErrorMessage, validateOtpCode } from '../utils/mfaValidation';
import { getDashboardPathForRole } from '../utils/roleHelpers';

export default function VerifyMfa() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    role,
    requiresMfa,
    loading,
    profileLoading,
    sendMfaOtp,
    verifyMfa,
    logout,
  } = useAuth();

  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const email = user?.email ?? '';
  const redirectPath =
    location.state?.from?.pathname ?? getDashboardPathForRole(role);

  useEffect(() => {
    if (loading || profileLoading) return;

    if (!user) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }

    if (!requiresMfa) {
      navigate(redirectPath, { replace: true });
    }
  }, [
    loading,
    profileLoading,
    user,
    requiresMfa,
    navigate,
    redirectPath,
  ]);

  useEffect(() => {
    if (!email || otpSent || loading || profileLoading || !requiresMfa) return;

    async function sendInitialOtp() {
      try {
        await sendMfaOtp(email);
        setOtpSent(true);
        toast.success('Verification code sent to your email.');
      } catch (error) {
        toast.error(getMfaErrorMessage(error));
      }
    }

    sendInitialOtp();
  }, [email, otpSent, loading, profileLoading, requiresMfa, sendMfaOtp]);

  async function handleResend() {
    setIsResending(true);
    setFormError('');

    try {
      await sendMfaOtp(email);
      setOtpSent(true);
      toast.success('A new verification code has been sent.');
    } catch (error) {
      const message = getMfaErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsResending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');

    const nextErrors = validateOtpCode(otp);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsVerifying(true);

    try {
      await verifyMfa(email, otp);
      toast.success('Two-factor authentication verified.');
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message = getMfaErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleCancel() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  if (loading || profileLoading || !user) {
    return <RouteLoader />;
  }

  return (
    <AuthCard
      title="Two-factor verification"
      subtitle="Enter the 6-digit code sent to your email"
      footer={
        <button
          type="button"
          onClick={handleCancel}
          className="font-medium text-slate-600 hover:text-slate-800"
        >
          Cancel and sign out
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-primary-50 p-3 text-primary-600">
            <HiOutlineShieldCheck className="h-8 w-8" aria-hidden="true" />
          </div>
        </div>

        <p className="text-center text-sm text-slate-600">
          Code sent to{' '}
          <strong className="font-medium text-slate-900">{email}</strong>
        </p>

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
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          label="Verification code"
          value={otp}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setOtp(value);
            if (errors.otp) {
              setErrors({});
            }
            if (formError) setFormError('');
          }}
          error={errors.otp}
          placeholder="000000"
          maxLength={6}
          disabled={isVerifying}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isVerifying}
          disabled={isVerifying}
        >
          Verify and continue
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={handleResend}
          isLoading={isResending}
          disabled={isResending || isVerifying}
        >
          Resend code
        </Button>
      </form>
    </AuthCard>
  );
}
