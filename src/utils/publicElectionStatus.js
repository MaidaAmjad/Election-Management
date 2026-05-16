import { ELECTION_STATUS } from './electionConstants';
import { PUBLIC_ELECTION_STATUS } from './publicElectionConstants';

export function getPublicElectionStatus(election) {
  if (!election || election.status === ELECTION_STATUS.DRAFT) {
    return null;
  }

  const now = Date.now();
  const start = new Date(election.start_datetime).getTime();
  const end = new Date(election.end_datetime).getTime();

  if (now < start) return PUBLIC_ELECTION_STATUS.UPCOMING;
  if (now >= start && now <= end) return PUBLIC_ELECTION_STATUS.ACTIVE;
  if (now > end) return PUBLIC_ELECTION_STATUS.COMPLETED;

  return PUBLIC_ELECTION_STATUS.UPCOMING;
}

export function getCountdownTarget(election, publicStatus) {
  if (!election) return null;

  if (publicStatus === PUBLIC_ELECTION_STATUS.UPCOMING) {
    return new Date(election.start_datetime);
  }

  if (publicStatus === PUBLIC_ELECTION_STATUS.ACTIVE) {
    return new Date(election.end_datetime);
  }

  return null;
}
