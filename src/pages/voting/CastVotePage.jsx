import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import VotingAvailabilityBanner from '../../components/voting/VotingAvailabilityBanner';
import VotingCountdown from '../../components/voting/VotingCountdown';
import SecretIdInput from '../../components/voting/SecretIdInput';
import CandidateBallot from '../../components/voting/CandidateBallot';
import LiveVoteStats from '../../components/voting/LiveVoteStats';
import VoteConfirmationModal from '../../components/voting/VoteConfirmationModal';
import VoteSuccessPanel from '../../components/voting/VoteSuccessPanel';
import { useVotingBallot } from '../../hooks/useVotingBallot';
import { useVoteCast } from '../../hooks/useVoteCast';
import { ROUTES } from '../../utils/constants';
import { VOTING_MESSAGES, VOTING_PHASE } from '../../utils/votingConstants';
import { getVotingPhase, isVotingEnabled } from '../../utils/votingAvailability';

export default function CastVotePage() {
  const { electionId, pollId } = useParams();
  const [voteComplete, setVoteComplete] = useState(false);

  const { ballot, voteCounts, loading, error, refresh } = useVotingBallot(pollId);

  const voteCast = useVoteCast({
    pollId,
    onSuccess: () => {
      setVoteComplete(true);
      refresh();
    },
  });

  const phase = useMemo(
    () => getVotingPhase(ballot?.election, ballot?.phase),
    [ballot],
  );

  const votingEnabled = isVotingEnabled(phase) && !ballot?.has_voted && !voteComplete;
  const controlsDisabled = !votingEnabled || voteCast.submitting;

  const selectedCandidate = ballot?.candidates?.find(
    (c) => c.id === voteCast.selectedCandidateId,
  );

  async function handleValidateSecret() {
    const ok = await voteCast.validateSecret();
    if (!ok) voteCast.resetSecret();
  }

  async function handleConfirmVote() {
    const result = await voteCast.submitVote();
    if (!result?.success) return;
    setVoteComplete(true);
  }

  function handleTimerExpired() {
    toast.error(VOTING_MESSAGES.ENDED);
    refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !ballot?.success) {
    return (
      <p className="text-red-600">
        {error ?? ballot?.message ?? 'Unable to load voting session.'}
      </p>
    );
  }

  if (ballot.has_voted && !voteComplete) {
    return (
      <div className="space-y-6">
        <BackLink electionId={electionId} />
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">You have already voted</p>
          <p className="mt-2 text-sm text-slate-600">
            Your ballot for this poll has been recorded. You cannot vote again.
          </p>
        </div>
      </div>
    );
  }

  if (voteComplete) {
    return (
      <div className="space-y-6">
        <BackLink electionId={electionId} />
        <VoteSuccessPanel electionId={electionId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink electionId={electionId} />

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
          Secure voting
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          {ballot.election.title}
        </h2>
        <p className="mt-1 text-lg text-slate-700">{ballot.poll.title}</p>
        {phase === VOTING_PHASE.OPEN && (
          <div className="mt-4">
            <VotingCountdown
              endDatetime={ballot.election.end_datetime}
              onExpired={handleTimerExpired}
            />
          </div>
        )}
      </header>

      <VotingAvailabilityBanner phase={phase} />

      <LiveVoteStats
        participation={ballot.participation}
        voteCounts={voteCounts}
        candidateCount={ballot.candidates?.length ?? 0}
      />

      <SecretIdInput
        value={voteCast.secretId}
        onChange={(v) => {
          voteCast.setSecretId(v);
          if (voteCast.secretValidated) voteCast.resetSecret();
        }}
        onValidate={handleValidateSecret}
        validating={voteCast.validatingSecret}
        validated={voteCast.secretValidated}
        disabled={controlsDisabled}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <CandidateBallot
          candidates={ballot.candidates}
          selectedId={voteCast.selectedCandidateId}
          onSelect={voteCast.setSelectedCandidateId}
          disabled={controlsDisabled || !voteCast.secretValidated}
          voteCounts={voteCounts}
        />

        <div className="mt-6 flex justify-end">
          <Button
            onClick={voteCast.openConfirmation}
            disabled={
              controlsDisabled ||
              !voteCast.secretValidated ||
              !voteCast.selectedCandidateId
            }
          >
            Continue
          </Button>
        </div>
      </section>

      <VoteConfirmationModal
        open={voteCast.showConfirm}
        onClose={() => voteCast.setShowConfirm(false)}
        electionTitle={ballot.election.title}
        candidateName={selectedCandidate?.name ?? '—'}
        onConfirm={handleConfirmVote}
        submitting={voteCast.submitting}
      />
    </div>
  );
}

function BackLink({ electionId }) {
  return (
    <Link
      to={electionId ? `${ROUTES.VOTER_VOTE}/${electionId}` : ROUTES.VOTER_VOTE}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary-700"
    >
      <HiOutlineArrowLeft className="h-4 w-4" />
      Back to polls
    </Link>
  );
}
