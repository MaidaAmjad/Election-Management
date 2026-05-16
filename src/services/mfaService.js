import { supabase } from '../supabase/supabase';

/**
 * Sends a one-time passcode to the user's email (Supabase Auth OTP).
 */
export async function sendEmailOtp(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) throw error;
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
