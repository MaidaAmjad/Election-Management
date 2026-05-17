import { supabase } from '../supabase/supabase';
import { USER_ROLES } from '../utils/constants';
import { normalizeRole } from '../utils/roleHelpers';
import { fetchUserRoles } from './userRoleService';

const PROFILE_BASE_COLUMNS = 'id, full_name, phone, role, created_at';

async function attachRoles(profile) {
  if (!profile?.id) return profile;
  const fromTable = await fetchUserRoles(profile.id);
  const fromProfile = normalizeRole(profile.role);
  const merged = [
    ...new Set([...fromTable, ...(fromProfile ? [fromProfile] : [])]),
  ];
  return {
    ...profile,
    roles: merged,
  };
}

function mapProfileRow(row) {
  if (!row) return null;
  return {
    ...row,
    mfa_email_enabled: row.mfa_email_enabled ?? false,
    role: normalizeRole(row.role) ?? row.role,
    roles: [],
  };
}

export async function getProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_BASE_COLUMNS}, mfa_email_enabled`)
    .eq('id', userId)
    .maybeSingle();

  if (!error && data) {
    return attachRoles(mapProfileRow(data));
  }

  if (error?.code === '42703' || error?.message?.includes('mfa_email_enabled')) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .select(PROFILE_BASE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return attachRoles(mapProfileRow(fallbackData));
  }

  if (error) throw error;
  return attachRoles(mapProfileRow(data));
}

export async function ensureProfileForUser(user) {
  if (!user?.id) return null;

  const existing = await getProfileByUserId(user.id);
  if (existing) return existing;

  const metadata = user.user_metadata ?? {};
  const role =
    normalizeRole(metadata.role) ?? USER_ROLES.VOTER;

  return createProfile({
    id: user.id,
    fullName: metadata.full_name ?? user.email?.split('@')[0] ?? 'User',
    phone: metadata.phone ?? '',
    role,
  });
}

export async function createProfile({ id, fullName, phone, role }) {
  const normalizedRole = normalizeRole(role) ?? USER_ROLES.VOTER;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        role: normalizedRole,
      },
      { onConflict: 'id' },
    )
    .select(`${PROFILE_BASE_COLUMNS}, mfa_email_enabled`)
    .single();

  if (error) throw error;
  const mapped = mapProfileRow(data);
  return attachRoles({ ...mapped, role: normalizedRole });
}

/** Active role for legacy profile.role column (audit, dashboards). */
export async function syncActiveProfileRole(userId, role) {
  const normalizedRole = normalizeRole(role);
  if (!userId || !normalizedRole) return null;

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: normalizedRole })
    .eq('id', userId)
    .select(`${PROFILE_BASE_COLUMNS}, mfa_email_enabled`)
    .single();

  if (error?.code === '42703' || error?.message?.includes('mfa_email_enabled')) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .update({ role: normalizedRole })
      .eq('id', userId)
      .select(PROFILE_BASE_COLUMNS)
      .single();

    if (fallbackError) throw fallbackError;
    return attachRoles(mapProfileRow(fallbackData));
  }

  if (error) throw error;
  return attachRoles(mapProfileRow(data));
}

export async function updateProfileRole(userId, role) {
  const normalizedRole = normalizeRole(role) ?? USER_ROLES.VOTER;

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: normalizedRole })
    .eq('id', userId)
    .select(`${PROFILE_BASE_COLUMNS}, mfa_email_enabled`)
    .single();

  if (error?.code === '42703' || error?.message?.includes('mfa_email_enabled')) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('profiles')
      .update({ role: normalizedRole })
      .eq('id', userId)
      .select(PROFILE_BASE_COLUMNS)
      .single();

    if (fallbackError) throw fallbackError;
    return mapProfileRow(fallbackData);
  }

  if (error) throw error;
  return mapProfileRow(data);
}

export async function updateMfaEmailEnabled(userId, enabled) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ mfa_email_enabled: enabled })
    .eq('id', userId)
    .select(`${PROFILE_BASE_COLUMNS}, mfa_email_enabled`)
    .single();

  if (error?.code === '42703' || error?.message?.includes('mfa_email_enabled')) {
    const profile = await getProfileByUserId(userId);
    if (!profile) throw error;
    return { ...profile, mfa_email_enabled: enabled };
  }

  if (error) throw error;
  return mapProfileRow(data);
}
