import { supabase } from '../supabase/supabase';

function parseJson(data) {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

function parseArray(data) {
  const parsed = parseJson(data);
  return Array.isArray(parsed) ? parsed : [];
}

export async function fetchAdminDashboardStats(days = 30) {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats', {
    p_days: days,
  });
  if (error) throw error;
  const result = parseJson(data);
  if (result?.success === false) throw new Error(result.message ?? 'Access denied');
  return result;
}

export async function fetchAdminRecentActivity(limit = 15) {
  const { data, error } = await supabase.rpc('get_admin_recent_activity', {
    p_limit: limit,
  });
  if (error) throw error;
  return parseArray(data);
}

export async function fetchCreatorDashboardStats() {
  const { data, error } = await supabase.rpc('get_creator_dashboard_stats');
  if (error) throw error;
  const result = parseJson(data);
  if (result?.success === false) throw new Error(result.message ?? 'Failed to load stats');
  return result;
}

export async function fetchCreatorDashboardElections({
  search = '',
  status = 'all',
  page = 1,
  pageSize = 6,
} = {}) {
  const { data, error } = await supabase.rpc('get_creator_dashboard_elections', {
    p_search: search || null,
    p_status: status === 'all' ? null : status,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  const result = parseJson(data);
  if (result?.success === false) throw new Error(result.message ?? 'Failed to load elections');
  return result;
}

export async function fetchCreatorResultsSummary(limit = 5) {
  const { data, error } = await supabase.rpc('get_creator_results_summary', {
    p_limit: limit,
  });
  if (error) throw error;
  return parseArray(data);
}

export async function fetchVoterDashboardStats() {
  const { data, error } = await supabase.rpc('get_voter_dashboard_stats');
  if (error) throw error;
  const result = parseJson(data);
  if (result?.success === false) throw new Error(result.message ?? 'Failed to load stats');
  return result;
}

export async function fetchVoterDashboardPolls({
  search = '',
  status = 'all',
  limit = 20,
} = {}) {
  const { data, error } = await supabase.rpc('get_voter_dashboard_polls', {
    p_search: search || null,
    p_status: status === 'all' ? null : status,
    p_limit: limit,
  });
  if (error) throw error;
  return parseArray(data);
}

export async function fetchVoterResultsSummary(limit = 5) {
  const { data, error } = await supabase.rpc('get_voter_results_summary', {
    p_limit: limit,
  });
  if (error) throw error;
  return parseArray(data);
}

export function subscribeDashboardRealtime(onChange) {
  const channel = supabase
    .channel('dashboard-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'elections' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'voter_registrations' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
