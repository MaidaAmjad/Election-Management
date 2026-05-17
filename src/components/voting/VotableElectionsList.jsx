import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import { ROUTES } from '../../utils/constants';
import { VOTING_PHASE } from '../../utils/votingConstants';
import { getVotingPhaseMessage } from '../../utils/votingAvailability';
import { formatElectionDate } from '../../utils/electionFormatters';

export default function VotableElectionsList({ elections }) {
  if (!elections.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-600">
        No elections ready for voting. Join a finalized election and wait for the
        voting period to open.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {elections.map((election) => {
        const openPolls = (election.polls ?? []).filter(
          (p) => !p.has_voted && p.has_secret_id,
        );
        const phaseMessage = getVotingPhaseMessage(election.phase);

        return (
          <li
            key={election.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="font-semibold text-slate-900">{election.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {formatElectionDate(election.start_datetime)} –{' '}
              {formatElectionDate(election.end_datetime)}
            </p>
            {phaseMessage && (
              <p className="mt-2 text-sm font-medium text-amber-800">{phaseMessage}</p>
            )}
            {election.phase === VOTING_PHASE.OPEN && (
              <p className="mt-2 text-sm text-emerald-700">
                {openPolls.length} poll{openPolls.length === 1 ? '' : 's'} ready to vote
              </p>
            )}
            <Link
              to={`${ROUTES.VOTER_VOTE}/${election.id}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600"
            >
              View polls
              <HiOutlineArrowRight className="h-4 w-4" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
