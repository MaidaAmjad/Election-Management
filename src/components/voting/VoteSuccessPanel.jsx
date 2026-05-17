import { Link } from 'react-router-dom';
import { HiOutlineCheckCircle } from 'react-icons/hi2';
import Button from '../ui/Button';
import { ROUTES } from '../../utils/constants';

export default function VoteSuccessPanel({ electionId }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
      <HiOutlineCheckCircle className="mx-auto h-12 w-12 text-emerald-600" />
      <h3 className="mt-4 text-xl font-bold text-slate-900">Vote submitted</h3>
      <p className="mt-2 text-slate-600">
        Your vote has been submitted successfully.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to={ROUTES.VOTER_VOTE}>
          <Button variant="secondary">Back to voting</Button>
        </Link>
        {electionId && (
          <Link to={`${ROUTES.VOTER_VOTE}/${electionId}`}>
            <Button variant="ghost">More polls</Button>
          </Link>
        )}
        <Link to={ROUTES.VOTER_VOTING_HISTORY}>
          <Button>Voting history</Button>
        </Link>
      </div>
    </div>
  );
}
