import { ELECTION_STATUS } from './electionConstants';
import { PUBLIC_ELECTION_STATUS } from './publicElectionConstants';
import { getPublicElectionStatus } from './publicElectionStatus';
import { USER_ROLES } from './constants';
import { REGISTRATION_ERROR_CODES } from './voterRegistrationConstants';

/**
 * Client-side eligibility checks before opening the join modal or calling RPC.
 * Server-side validation in register_voter_for_election remains authoritative.
 */
export function validateVoterRegistrationEligibility({
  election,
  isAuthenticated,
  role,
  registration,
}) {
  if (!election) {
    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.ELECTION_NOT_FOUND,
      message: 'Election not found.',
    };
  }

  if (!isAuthenticated) {
    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.NOT_AUTHENTICATED,
      message: 'You must be logged in to register.',
    };
  }

  if (role !== USER_ROLES.VOTER) {
    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.NOT_VOTER,
      message: 'Only voter accounts can register for elections.',
    };
  }

  const publicStatus = election.publicStatus ?? getPublicElectionStatus(election);
  const now = Date.now();
  const deadline = new Date(election.registration_deadline).getTime();
  const start = new Date(election.start_datetime).getTime();

  if (
    election.status === ELECTION_STATUS.COMPLETED ||
    publicStatus === PUBLIC_ELECTION_STATUS.COMPLETED
  ) {
    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.ELECTION_COMPLETED,
      message: 'This election has been completed.',
    };
  }

  if (election.status === ELECTION_STATUS.DRAFT) {
    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.NOT_ELIGIBLE,
      message: 'You are not eligible for this election',
    };
  }

  if (now > deadline) {
    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.DEADLINE_PASSED,
      message: 'Registration deadline has passed',
    };
  }

  if (now >= start && now > deadline) {
    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.REGISTRATION_CLOSED,
      message: 'Registration closed',
    };
  }

  if (registration) {
    if (registration.status === 'Rejected') {
      return {
        eligible: false,
        code: REGISTRATION_ERROR_CODES.NOT_ELIGIBLE,
        message: 'You are not eligible for this election',
      };
    }

    return {
      eligible: false,
      code: REGISTRATION_ERROR_CODES.ALREADY_JOINED,
      message: 'You already joined this election',
      registration,
    };
  }

  return { eligible: true };
}

export function getRegistrationDeadlineState(election) {
  if (!election?.registration_deadline) {
    return { isOpen: false, label: 'Registration Closed' };
  }

  const isOpen = Date.now() <= new Date(election.registration_deadline).getTime();
  return {
    isOpen,
    label: isOpen ? null : 'Registration Closed',
  };
}

export function computeRegistrationStats(election, activeCount) {
  const maxVoters = election?.max_voters ?? 0;
  const registered = activeCount ?? 0;
  const availableSeats = Math.max(0, maxVoters - registered);

  return {
    totalRegistered: registered,
    maxVoters,
    availableSeats,
    isFull: registered >= maxVoters,
  };
}

export function getRemainingRegistrationMs(election) {
  if (!election?.registration_deadline) return 0;
  return Math.max(
    0,
    new Date(election.registration_deadline).getTime() - Date.now(),
  );
}
