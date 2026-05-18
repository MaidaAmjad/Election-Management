import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import Spinner from '../../components/ui/Spinner';
import VotingAvailabilityBanner from '../../components/voting/VotingAvailabilityBanner';
import PollVoteList from '../../components/voting/PollVoteList';
import { useVotableElections } from '../../hooks/useVotableElections';
import { ROUTES } from '../../utils/constants';
import { getVotingPhase } from '../../utils/votingAvailability';

export default function VoterElectionPollsPage() {
  const { electionId } = useParams();
  const { elections, loading, error } = useVotableElections();

  const election = useMemo(
    () => elections.find((e) => e.id === electionId),
    [elections, electionId],
  );

  const phase = getVotingPhase(
    election
      ? {
          start_datetime: election.start_datetime,
          end_datetime: election.end_datetime,
          status: election.status,
        }
      : null,
    election?.phase,
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (!election) {
    return (
      <div className="space-y-3">
        <p className="text-slate-600">
          This election is not available for voting yet, or you are not registered.
        </p>
        <Link
          to={ROUTES.VOTER_DASHBOARD}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={ROUTES.VOTER_VOTE}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          All elections
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">{election.title}</h2>
        <p className="mt-1 text-slate-600">Select a poll to cast your vote</p>
      </div>

      <VotingAvailabilityBanner phase={phase} />
      <PollVoteList election={election} phase={phase} />
    </div>
  );
}
