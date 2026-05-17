import { ELECTION_STATUS } from './electionConstants';
import { VOTING_MESSAGES, VOTING_PHASE } from './votingConstants';

/**
 * Voting window is driven by election schedule; stored status is synced separately.
 */
export function getVotingPhase(election, serverPhase) {
  if (serverPhase) return serverPhase;
  if (!election) return VOTING_PHASE.UNAVAILABLE;

  if (election.status === ELECTION_STATUS.DRAFT) {
    return VOTING_PHASE.UNAVAILABLE;
  }

  const now = Date.now();
  const start = new Date(election.start_datetime).getTime();
  const end = new Date(election.end_datetime).getTime();

  if (election.status === ELECTION_STATUS.COMPLETED || now > end) {
    return VOTING_PHASE.CLOSED;
  }

  if (now < start) {
    return VOTING_PHASE.NOT_STARTED;
  }

  if (now >= start && now <= end) {
    return VOTING_PHASE.OPEN;
  }

  return VOTING_PHASE.CLOSED;
}

export function getVotingPhaseMessage(phase) {
  switch (phase) {
    case VOTING_PHASE.NOT_STARTED:
      return VOTING_MESSAGES.NOT_STARTED;
    case VOTING_PHASE.CLOSED:
      return VOTING_MESSAGES.ENDED;
    case VOTING_PHASE.OPEN:
      return null;
    default:
      return VOTING_MESSAGES.CLOSED;
  }
}

export function isVotingEnabled(phase) {
  return phase === VOTING_PHASE.OPEN;
}

export function getRemainingMs(endDatetime) {
  if (!endDatetime) return 0;
  return Math.max(0, new Date(endDatetime).getTime() - Date.now());
}
