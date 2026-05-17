import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineExclamationCircle } from 'react-icons/hi2';
import AuthCard from '../components/auth/AuthCard';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import {
  sendSignupVerificationEmail,
  verifySignupEmailToken,
} from '../services/notificationService';
import { ROUTES } from '../utils/constants';
import { getPostAuthDestination } from '../utils/postAuthNavigation';
import { normalizeRole } from '../utils/roleHelpers';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, profile, role } = useAuth();

  const [status, setStatus] = useState(token ? 'verifying' : 'pending');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;

    async function verify() {
      try {
        await verifySignupEmailToken(token);
        if (!cancelled) {
          setStatus('success');
          toast.success('Email verified successfully!');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('failed');
          setError(err.message ?? 'Verification failed.');
          toast.error(err.message ?? 'Verification failed.');
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (!user?.id || !user?.email) {
      toast.error('Sign in to resend verification email.');
      return;
    }
    if (cooldown > 0) return;

    setResending(true);
    setError('');
    try {
      await sendSignupVerificationEmail({
        email: user.email,
        userId: user.id,
        fullName: profile?.full_name ?? '',
      });
      toast.success('Verification email sent.');
      setCooldown(60);
    } catch (err) {
      const message = err.message ?? 'Failed to send email';
      if (message.includes('wait') || message.includes('429')) {
        setCooldown(60);
      }
      setError(message);
      toast.error(message);
    } finally {
      setResending(false);
    }
  }

  async function continueToApp() {
    const actualRole = normalizeRole(profile?.role ?? role);
    const dest = await getPostAuthDestination(actualRole, user?.id);
    navigate(dest, { replace: true });
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Confirm your address to secure your account"
    >
      {status === 'verifying' && (
        <p className="text-center text-sm text-slate-600">Verifying your link…</p>
      )}

      {status === 'success' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-emerald-700">
            Your email has been verified. You can now use all features of your account.
          </p>
          {user ? (
            <Button onClick={continueToApp}>Continue to dashboard</Button>
          ) : (
            <Link to={ROUTES.LOGIN}>
              <Button>Sign in</Button>
            </Link>
          )}
        </div>
      )}

      {status === 'failed' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <HiOutlineExclamationCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error || 'This verification link is invalid or has expired.'}</p>
          </div>
          {user && (
            <Button onClick={handleResend} isLoading={resending} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </Button>
          )}
          <p className="text-center text-sm">
            <Link to={ROUTES.LOGIN} className="font-medium text-primary-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      )}

      {(status === 'pending' || (!token && status !== 'success')) && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <HiOutlineEnvelope className="h-12 w-12 text-primary-500" aria-hidden="true" />
          </div>
          <p className="text-center text-sm text-slate-600">
            We sent a verification link to{' '}
            <strong>{user?.email ?? 'your email'}</strong>. Check your inbox and spam folder.
          </p>
          {user ? (
            <Button
              onClick={handleResend}
              isLoading={resending}
              disabled={cooldown > 0}
              className="w-full"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
            </Button>
          ) : (
            <p className="text-center text-sm text-slate-500">
              Open the link from your email, or{' '}
              <Link to={ROUTES.LOGIN} className="text-primary-600 hover:underline">
                sign in
              </Link>{' '}
              to request a new one.
            </p>
          )}
          {error && (
            <p className="text-center text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </AuthCard>
  );
}
