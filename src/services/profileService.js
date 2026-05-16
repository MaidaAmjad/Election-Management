import { supabase } from '../supabase/supabase';
import { USER_ROLES } from '../utils/constants';

export async function getProfileByUserId(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, role, created_at')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function createProfile({ id, fullName, phone, role }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        role: role ?? USER_ROLES.VOTER,
      },
      { onConflict: 'id' },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
