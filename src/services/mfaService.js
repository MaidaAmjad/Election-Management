import {
  sendMfaOtpEmail,
  verifyMfaOtpEmail,
} from './emailService';
import {
  getOtpCooldownRemainingMs,
  markOtpSent,
} from '../utils/otpCooldown';

/**
 * Sends a 6-digit MFA code via Resend (not Supabase Auth email).
 */
export async function sendEmailOtp(email) {
  const trimmed = email.trim();
  const remainingMs = getOtpCooldownRemainingMs(trimmed);

  if (remainingMs > 0) {
    const seconds = Math.ceil(remainingMs / 1000);
    throw new Error(
      `Please wait ${seconds} seconds before requesting another code.`,
    );
  }

  await sendMfaOtpEmail(trimmed);
  markOtpSent(trimmed);
}

/**
 * Verifies MFA code sent by Resend.
 */
export async function verifyEmailOtp(email, token) {
  await verifyMfaOtpEmail(email, token);
}
