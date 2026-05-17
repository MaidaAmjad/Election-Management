import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import ElectionParticipationModal from './ElectionParticipationModal';
import { useAuth } from '../../hooks/useAuth';
import { useJoinElection } from '../../hooks/useJoinElection';
import { ROUTES, USER_ROLES } from '../../utils/constants';
import { PUBLIC_ELECTION_STATUS } from '../../utils/publicElectionConstants';
import { VOTER_REGISTRATION_STATUS } from '../../utils/voterRegistrationConstants';
import {
  getRegistrationDeadlineState,
  validateVoterRegistrationEligibility,
} from '../../utils/voterRegistrationValidation';

export default function JoinElectionButton({
  election,
  registration,
  onRegistrationChange,
}) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const { register, submitting } = useJoinElection({
    onSuccess: () => {
      setModalOpen(false);
      onRegistrationChange?.();
    },
  });

  if (!election) return null;

  const deadlineState = getRegistrationDeadlineState(election);
  const eligibility = validateVoterRegistrationEligibility({
    election,
    isAuthenticated,
    role,
    registration,
  });

  const isCompleted =
    election.publicStatus === PUBLIC_ELECTION_STATUS.COMPLETED;

  if (isCompleted) {
    return (
      <Button disabled className="w-full sm:w-auto">
        Election ended
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link to={ROUTES.CHOOSE_ROLE} state={{ from: location.pathname }}>
        <Button className="w-full sm:w-auto">Login to Join Election</Button>
      </Link>
    );
  }

  if (role !== USER_ROLES.VOTER) {
    return (
      <p className="text-sm text-slate-600">
        Only voter accounts can register for elections. Sign in with a voter
        account to participate.
      </p>
    );
  }

  if (registration) {
    const isWaitlisted =
      registration.status === VOTER_REGISTRATION_STATUS.WAITLISTED;

    return (
      <div className="space-y-2">
        <Button disabled variant="secondary" className="w-full sm:w-auto">
          {isWaitlisted ? 'On waitlist' : 'Already Registered'}
        </Button>
        {isWaitlisted && registration.waitlist_position != null && (
          <p className="text-sm font-medium text-amber-800">
            Your Waitlist Position: {registration.waitlist_position}
          </p>
        )}
        {!isWaitlisted && (
          <p className="text-sm text-emerald-700">Already Registered</p>
        )}
      </div>
    );
  }

  if (deadlineState.label) {
    return (
      <div className="space-y-1">
        <Button disabled className="w-full sm:w-auto">
          Registration Closed
        </Button>
        <p className="text-sm text-slate-600">{deadlineState.label}</p>
      </div>
    );
  }

  if (!eligibility.eligible) {
    return (
      <div className="space-y-1">
        <Button disabled className="w-full sm:w-auto">
          Join Election
        </Button>
        <p className="text-sm text-red-600" role="alert">
          {eligibility.message}
        </p>
      </div>
    );
  }

  async function handleConfirm() {
    await register(election.id);
  }

  return (
    <>
      <Button
        className="w-full sm:w-auto"
        onClick={() => setModalOpen(true)}
      >
        Join Election
      </Button>

      <ElectionParticipationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirm}
        submitting={submitting}
      />
    </>
  );
}
