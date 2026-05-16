import { supabase } from '../supabase/supabase';
import { USER_ROLES } from '../utils/constants';
import { createProfile } from './profileService';

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
      emailRedirectTo: `${window.location.origin}/login`,
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

  if (data.user && data.session) {
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
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
      redirectTo: `${window.location.origin}/login`,
    },
  );
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
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return subscription;
}

export async function resendVerificationEmail(email) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw error;
  return data;
}
