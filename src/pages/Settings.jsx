import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineExclamationCircle } from 'react-icons/hi2';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import { useAuth } from '../hooks/useAuth';
import { getMfaErrorMessage, validateOtpCode } from '../utils/mfaValidation';
import { getDashboardPathForRole } from '../utils/roleHelpers';

export default function Settings() {
  const {
    profile,
    role,
    user,
    sendMfaOtp,
    verifyMfa,
    setMfaEnabled,
    markMfaVerified,
    refreshProfile,
  } = useAuth();

  const mfaEnabled = Boolean(profile?.mfa_email_enabled);
  const [pendingEnable, setPendingEnable] = useState(false);
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const dashboardPath = getDashboardPathForRole(role);
  const email = user?.email ?? '';

  async function handleToggle(nextEnabled) {
    setFormError('');

    if (!nextEnabled) {
      setIsSubmitting(true);
      try {
        await setMfaEnabled(false);
        setPendingEnable(false);
        setOtp('');
        toast.success('Email two-factor authentication disabled.');
      } catch (error) {
        toast.error(error.message ?? 'Failed to update security settings.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSendingOtp(true);
    try {
      await sendMfaOtp(email);
      setPendingEnable(true);
      toast.success('Enter the code sent to your email to enable 2FA.');
    } catch (error) {
      const message = getMfaErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleConfirmEnable(event) {
    event.preventDefault();
    setFormError('');

    const nextErrors = validateOtpCode(otp);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);

    try {
      await verifyMfa(email, otp);
      await setMfaEnabled(true);
      markMfaVerified();
      await refreshProfile();
      setPendingEnable(false);
      setOtp('');
      toast.success('Email two-factor authentication enabled.');
    } catch (error) {
      const message = getMfaErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancelEnable() {
    setPendingEnable(false);
    setOtp('');
    setErrors({});
    setFormError('');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          to={dashboardPath}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Security settings</h2>
        <p className="mt-2 text-slate-600">
          Manage two-factor authentication for your account.
        </p>
      </div>

      <section className="space-y-4">
        <Toggle
          id="mfa-email-toggle"
          label="Email two-factor authentication"
          description="Require a one-time code sent to your email when signing in."
          enabled={mfaEnabled || pendingEnable}
          onChange={handleToggle}
          disabled={isSubmitting || isSendingOtp || pendingEnable}
        />

        {pendingEnable && !mfaEnabled && (
          <form
            onSubmit={handleConfirmEnable}
            className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/50 p-4"
          >
            <p className="text-sm text-slate-700">
              Enter the 6-digit code sent to <strong>{email}</strong> to turn on
              2FA.
            </p>

            {formError && (
              <div
                role="alert"
                className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                <HiOutlineExclamationCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>{formError}</span>
              </div>
            )}

            <Input
              id="settings-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              label="Verification code"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                setErrors({});
                setFormError('');
              }}
              error={errors.otp}
              placeholder="000000"
              maxLength={6}
              disabled={isSubmitting}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" isLoading={isSubmitting} className="sm:flex-1">
                Confirm and enable
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelEnable}
                disabled={isSubmitting}
                className="sm:flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Supabase sends OTP codes via email. Ensure email auth is enabled in your
        Supabase project and check spam if codes do not arrive.
      </p>
    </div>
  );
}
