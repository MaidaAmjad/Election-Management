import { supabase } from '../supabase/supabase';
import {
  getOtpCooldownRemainingMs,
  markOtpSent,
} from '../utils/otpCooldown';
/**
 * Sends a one-time passcode to the user's email (Supabase Auth OTP).
 * Enforces a client-side cooldown to avoid hitting Supabase email rate limits.
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

  const { data, error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) throw error;

  markOtpSent(trimmed);
  return data;
}

/**
 * Verifies the email OTP code from the user's inbox.
 */
export async function verifyEmailOtp(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });

  if (error) throw error;
  return data;
}
