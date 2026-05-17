export function isExistingUserSignupError(error) {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'user_already_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('user already exists') ||
    msg.includes('email address is already') ||
    msg.includes('already in use')
  );
}

export function isMissingMultiRoleMigrationError(error) {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    msg.includes('register_additional_role') ||
    msg.includes('get_user_roles') ||
    msg.includes('user_roles')
  );
}

export function formatRoleRegistrationError(error) {
  if (isMissingMultiRoleMigrationError(error)) {
    return 'Multi-role signup is not enabled on the server. Ask your administrator to run supabase/migrations/020_user_roles_multi_role.sql in Supabase SQL Editor.';
  }
  if (error?.code === 'ROLE_ALREADY_REGISTERED') {
    return error.message;
  }
  if (error?.code === 'EXISTING_EMAIL_WRONG_PASSWORD') {
    return error.message;
  }
  return error?.message ?? 'Could not add this role. Please try again.';
}
