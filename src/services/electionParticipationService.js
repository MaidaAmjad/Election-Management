export {
  fetchVoterRegistrationForElection,
  joinElection,
  cancelVoterRegistration,
  fetchVoterJoinedElections,
} from './voterRegistrationService';

export { isUserRegisteredForElection } from './publicElectionService';

/** @deprecated Use joinElection(electionId) — voter is resolved from the session */
export async function registerForElection(electionId) {
  const { joinElection } = await import('./voterRegistrationService');
  return joinElection(electionId);
}
