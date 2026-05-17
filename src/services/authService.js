import { supabase } from '../supabase/supabase';
import { ROUTES, USER_ROLES } from '../utils/constants';
import { createProfile } from './profileService';
import {
  confirmSignupEmail,
  sendPasswordResetEmail,
  completePasswordResetWithToken,
} from './emailService';

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail({
  email,
  password,
  fullName,
  phone,
  role = USER_ROLES.VOTER,
}) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        role,
      },
    },
  });

  if (error) throw error;

  if (data.user?.identities?.length === 0) {
    return data;
  }

  if (data.user) {
    try {
      await createProfile({
        id: data.user.id,
        fullName,
        phone,
        role,
      });
    } catch (profileError) {
      console.error('[Signup] Profile insert failed:', profileError.message);
    }

    if (!data.session) {
      try {
        await confirmSignupEmail(data.user.id);
      } catch (confirmError) {
        console.error('[Signup] Email confirm failed:', confirmError.message);
      }
    }
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Password reset email via Resend (not Supabase Auth mail). */
export async function resetPassword(email) {
  await sendPasswordResetEmail(email);
}

/** Complete reset using token from email link. */
export async function resetPasswordWithToken(token, password) {
  await completePasswordResetWithToken(token, password);
}

export async function updateUserPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return subscription;
}
