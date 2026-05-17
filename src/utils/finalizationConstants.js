export const REGISTRATION_STATUS = {
  OPEN: 'Open',
  LOCKED: 'Locked',
  FINALIZED: 'Finalized',
};

export const LOCK_LOG_ACTIONS = {
  AUTO_LOCKED: 'AUTO_LOCKED',
  REGISTRATION_UNLOCKED: 'REGISTRATION_UNLOCKED',
  REGISTRATION_LOCKED: 'REGISTRATION_LOCKED',
  MAX_VOTERS_CHANGED: 'MAX_VOTERS_CHANGED',
  MANUAL_VOTER_ADDED: 'MANUAL_VOTER_ADDED',
  MANUAL_VOTER_REMOVED: 'MANUAL_VOTER_REMOVED',
  FINALIZED: 'FINALIZED',
};

export const LOCK_LOG_ACTION_LABELS = {
  [LOCK_LOG_ACTIONS.AUTO_LOCKED]: 'Registration auto-locked',
  [LOCK_LOG_ACTIONS.REGISTRATION_UNLOCKED]: 'Registration unlocked',
  [LOCK_LOG_ACTIONS.REGISTRATION_LOCKED]: 'Registration locked',
  [LOCK_LOG_ACTIONS.MAX_VOTERS_CHANGED]: 'Maximum voter count changed',
  [LOCK_LOG_ACTIONS.MANUAL_VOTER_ADDED]: 'Manual voter addition',
  [LOCK_LOG_ACTIONS.MANUAL_VOTER_REMOVED]: 'Manual voter removal',
  [LOCK_LOG_ACTIONS.FINALIZED]: 'Voter list finalized',
};

export const AUTO_LOCK_MESSAGE =
  'Registration has been automatically locked because maximum voters have been reached.';

export const FINALIZED_VOTER_PAGE_SIZE = 10;
