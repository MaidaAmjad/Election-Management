import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { registerForElection } from '../../services/electionParticipationService';
import { ROUTES, USER_ROLES } from '../../utils/constants';
import { PUBLIC_ELECTION_STATUS } from '../../utils/publicElectionConstants';

export default function ParticipateButton({
  election,
  isRegistered,
  onRegistered,
}) {
  const { isAuthenticated, user, role } = useAuth();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  if (!election) return null;

  const isCompleted =
    election.publicStatus === PUBLIC_ELECTION_STATUS.COMPLETED;
  const pastDeadline =
    Date.now() > new Date(election.registration_deadline).getTime();
  const atCapacity =
    election.registered_voters_count >= election.max_voters;

  if (isCompleted) {
    return (
      <Button disabled className="w-full sm:w-auto">
        Election ended
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <Link
        to={ROUTES.CHOOSE_ROLE}
        state={{ from: location.pathname }}
      >
        <Button className="w-full sm:w-auto">Login to Participate</Button>
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

  if (isRegistered) {
    return (
      <Button disabled variant="secondary" className="w-full sm:w-auto">
        You are registered
      </Button>
    );
  }

  if (pastDeadline) {
    return (
      <Button disabled className="w-full sm:w-auto">
        Registration closed
      </Button>
    );
  }

  if (atCapacity) {
    return (
      <Button disabled className="w-full sm:w-auto">
        Registration full
      </Button>
    );
  }

  async function handleParticipate() {
    setSubmitting(true);
    try {
      await registerForElection(election.id, user.id);
      toast.success('You are registered for this election.');
      onRegistered?.();
    } catch (err) {
      toast.error(err.message ?? 'Could not register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      className="w-full sm:w-auto"
      onClick={handleParticipate}
      disabled={submitting}
    >
      {submitting ? 'Registering…' : 'I Want to Participate'}
    </Button>
  );
}
