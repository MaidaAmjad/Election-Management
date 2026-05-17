import { fetchAuditLogs, logAudit } from './auditLogService';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../utils/auditConstants';

/** @deprecated Use logAudit — kept for backward compatibility */
export async function logActivity({ userId, action, description, moduleName, electionId }) {
  return logAudit({
    userId,
    actionType: action,
    moduleName: moduleName ?? AUDIT_MODULES.LEGACY,
    description,
    electionId,
  });
}

export async function fetchActivityLogs() {
  const result = await fetchAuditLogs({ page: 1, pageSize: 500 });
  return (result.rows ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    action: row.action_type,
    description: row.description,
    created_at: row.created_at,
    user_name: row.user_name,
  }));
}
