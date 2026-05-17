import { supabase } from '../supabase/supabase';
import { normalizeRole } from '../utils/roleHelpers';
import { formatRoleRegistrationError } from '../utils/authErrors';

export async function fetchUserRoles(userId) {
  if (!userId) return [];

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_roles', {
    p_user_id: userId,
  });

  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData.map((role) => normalizeRole(role)).filter(Boolean);
  }

  const { data: rows, error: tableError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (!tableError && rows?.length) {
    return rows.map((row) => normalizeRole(row.role)).filter(Boolean);
  }

  if (
    rpcError?.code === '42883' ||
    rpcError?.message?.includes('get_user_roles') ||
    tableError?.code === '42P01'
  ) {
    return [];
  }

  if (rpcError) throw rpcError;
  if (tableError) throw tableError;

  return [];
}

export async function registerAdditionalRole({ role, fullName, phone }) {
  const { data, error } = await supabase.rpc('register_additional_role', {
    p_role: role,
    p_full_name: fullName ?? null,
    p_phone: phone ?? null,
  });

  if (error) {
    const wrapped = new Error(formatRoleRegistrationError(error));
    wrapped.cause = error;
    throw wrapped;
  }

  if (data?.success === false) {
    const err = new Error(data.message ?? 'Could not register role.');
    err.code = data.code;
    throw err;
  }

  return data;
}

export { userHasRoleInList } from '../utils/roleHelpers';
