import { Link } from 'react-router-dom';
import { HiOutlineArrowRight, HiOutlineCheckCircle } from 'react-icons/hi2';
import { ROUTES } from '../../utils/constants';
import { VOTING_PHASE } from '../../utils/votingConstants';

export default function PollVoteList({ election, phase }) {
  const polls = election?.polls ?? [];
  const votingOpen = phase === VOTING_PHASE.OPEN;

  if (!polls.length) {
    return (
      <p className="text-sm text-slate-600">This election has no polls configured.</p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {polls.map((poll) => {
        const canVote = votingOpen && !poll.has_voted && poll.has_secret_id;

        return (
          <li
            key={poll.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
          >
            <div>
              <p className="font-medium text-slate-900">{poll.title}</p>
              {poll.has_voted && (
                <p className="mt-1 flex items-center gap-1 text-sm text-emerald-700">
                  <HiOutlineCheckCircle className="h-4 w-4" />
                  You have already voted
                </p>
              )}
              {!poll.has_secret_id && !poll.has_voted && (
                <p className="mt-1 text-sm text-slate-500">
                  Secret ID not available for this poll
                </p>
              )}
            </div>
            {canVote ? (
              <Link
                to={`${ROUTES.VOTER_VOTE}/${election.id}/${poll.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Cast vote
                <HiOutlineArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="text-sm text-slate-500">
                {poll.has_voted ? 'Completed' : 'Unavailable'}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
