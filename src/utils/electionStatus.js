import { ELECTION_STATUS } from './electionConstants';
import { ELECTION_APPROVAL_STATUS } from './electionApprovalConstants';

/**
 * Derives display status from stored status and schedule.
 * Draft stays Draft. Published may show as Published, Active, or Completed.
 */
export function getEffectiveStatus(election) {
  if (!election) return null;

  const stored = election.status;

  if (stored === ELECTION_STATUS.DRAFT) {
    return ELECTION_STATUS.DRAFT;
  }

  if (
    stored === ELECTION_STATUS.PUBLISHED ||
    stored === ELECTION_STATUS.ACTIVE ||
    stored === ELECTION_STATUS.COMPLETED
  ) {
    const now = Date.now();
    const start = new Date(election.start_datetime).getTime();
    const end = new Date(election.end_datetime).getTime();

    if (now < start) return ELECTION_STATUS.PUBLISHED;
    if (now >= start && now <= end) return ELECTION_STATUS.ACTIVE;
    if (now > end) return ELECTION_STATUS.COMPLETED;
  }

  return stored;
}

export function isElectionPendingApproval(election) {
  return election?.approval_status === ELECTION_APPROVAL_STATUS.PENDING;
}

export function isElectionEditable(election) {
  if (election?.status !== ELECTION_STATUS.DRAFT) return false;
  if (isElectionPendingApproval(election)) return false;
  const approval = election?.approval_status;
  return !approval || approval === ELECTION_APPROVAL_STATUS.REJECTED;
}

export function isElectionReadOnly(election) {
  return !isElectionEditable(election);
}
