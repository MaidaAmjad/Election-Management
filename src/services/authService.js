import { supabase } from '../supabase/supabase';
import { ROUTES, USER_ROLES } from '../utils/constants';
import { createProfile } from './profileService';
import { normalizeRole, profileHasRole } from '../utils/roleHelpers';
import {
  formatRoleRegistrationError,
  isExistingUserSignupError,
} from '../utils/authErrors';
import { registerAdditionalRole, fetchUserRoles } from './userRoleService';
import { getProfileByUserId, syncActiveProfileRole } from './profileService';
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

async function signInAndAddRole({
  email,
  password,
  fullName,
  phone,
  role,
}) {
  let signedIn;
  try {
    signedIn = await signInWithEmail(email, password);
  } catch {
    const err = new Error(
      'This email is already registered. Enter your correct password to add this role.',
    );
    err.code = 'EXISTING_EMAIL_WRONG_PASSWORD';
    throw err;
  }

  await registerAdditionalRole({ role, fullName, phone });
  await syncActiveProfileRole(signedIn.user.id, role);
  const profile = await getProfileByUserId(signedIn.user.id);

  if (!profileHasRole(profile, role)) {
    const roles = await fetchUserRoles(signedIn.user.id);
    if (!roles.includes(normalizeRole(role))) {
      throw new Error(formatRoleRegistrationError({ message: 'user_roles' }));
    }
  }

  return {
    user: signedIn.user,
    session: signedIn.session,
    profile,
    addedRole: true,
  };
}

export async function signUpWithEmail({
  email,
  password,
  fullName,
  phone,
  role = USER_ROLES.VOTER,
}) {
  const normalizedRole = normalizeRole(role) ?? USER_ROLES.VOTER;

  if (normalizedRole === USER_ROLES.SUPER_ADMIN) {
    throw new Error('Super Admin accounts cannot be created through self-registration.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        role: normalizedRole,
      },
    },
  });

  if (error) {
    if (isExistingUserSignupError(error)) {
      return signInAndAddRole({
        email,
        password,
        fullName,
        phone,
        role: normalizedRole,
      });
    }
    throw error;
  }

  // Older Supabase: existing user returned with empty identities
  if (data.user?.identities?.length === 0) {
    return signInAndAddRole({
      email,
      password,
      fullName,
      phone,
      role: normalizedRole,
    });
  }

  if (data.user) {
    try {
      await createProfile({
        id: data.user.id,
        fullName,
        phone,
        role: normalizedRole,
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
