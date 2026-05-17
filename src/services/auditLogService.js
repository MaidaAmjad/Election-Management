import { supabase } from '../supabase/supabase';

let cachedIp = null;

async function resolveClientIp() {
  if (cachedIp !== null) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    cachedIp = data?.ip ?? null;
  } catch {
    cachedIp = null;
  }
  return cachedIp;
}

export async function logAudit({
  actionType,
  moduleName,
  description,
  electionId = null,
  pollId = null,
  userId = null,
  ipAddress = null,
}) {
  const ip = ipAddress ?? (await resolveClientIp());

  const { data, error } = await supabase.rpc('insert_audit_log', {
    p_action_type: actionType,
    p_module_name: moduleName,
    p_description: description ?? '',
    p_election_id: electionId,
    p_poll_id: pollId,
    p_ip_address: ip,
    p_user_id: userId,
  });

  if (error) {
    console.error('[AuditLog]', error.message);
    throw error;
  }

  return data;
}

export async function fetchAuditLogs(filters = {}) {
  const { data, error } = await supabase.rpc('get_audit_logs', {
    p_search: filters.search ?? null,
    p_role: filters.role && filters.role !== 'all' ? filters.role : null,
    p_module: filters.module && filters.module !== 'all' ? filters.module : null,
    p_action_type:
      filters.actionType && filters.actionType !== 'all' ? filters.actionType : null,
    p_date_from: filters.dateFrom ?? null,
    p_date_to: filters.dateTo ?? null,
    p_page: filters.page ?? 1,
    p_page_size: filters.pageSize ?? 20,
    p_election_id: filters.electionId ?? null,
  });

  if (error) throw error;
  if (!data?.success) throw new Error(data?.message ?? 'Failed to load audit logs.');
  return data;
}

export async function fetchAuditLogById(logId) {
  const { data, error } = await supabase.rpc('get_audit_log_by_id', {
    p_log_id: logId,
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.message ?? 'Log not found.');
  return data.log;
}

export async function fetchOverrideLogs({ electionId, page = 1, pageSize = 15 } = {}) {
  const { data, error } = await supabase.rpc('get_override_logs', {
    p_election_id: electionId ?? null,
    p_page: page,
    p_page_size: pageSize,
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.message ?? 'Failed to load override logs.');
  return data;
}

export async function fetchAuditDashboardStats(days = 30) {
  const { data, error } = await supabase.rpc('get_audit_dashboard_stats', {
    p_days: days,
  });
  if (error) throw error;
  if (!data?.success) throw new Error(data?.message ?? 'Failed to load dashboard.');
  return data;
}

export async function canExportAuditLogs() {
  const { data, error } = await supabase.rpc('can_export_audit_logs');
  if (error) return false;
  return Boolean(data);
}

export function subscribeToAuditLogs(onChange) {
  const channel = supabase
    .channel('audit-logs-live')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
