import { supabase } from '../supabase/supabase';

async function attachUserNames(logs) {
  if (!logs?.length) return [];

  const userIds = [
    ...new Set(logs.map((l) => l.user_id).filter(Boolean)),
  ];

  if (userIds.length === 0) {
    return logs.map((row) => ({
      ...row,
      user_name: 'System',
    }));
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  if (error) throw error;

  const nameMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name]),
  );

  return logs.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    action: row.action,
    description: row.description,
    created_at: row.created_at,
    user_name: row.user_id ? nameMap[row.user_id] ?? 'Unknown user' : 'System',
  }));
}

export async function logActivity({ userId, action, description }) {
  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId ?? null,
    action,
    description: description ?? '',
  });

  if (error) {
    console.error('[ActivityLog]', error.message);
    throw error;
  }
}

export async function fetchActivityLogs() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachUserNames(data ?? []);
}
