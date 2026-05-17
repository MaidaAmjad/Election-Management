import VotingHistoryTable from '../../components/voting/VotingHistoryTable';
import { useVotingHistory } from '../../hooks/useVotingHistory';

export default function MyVotingHistoryPage() {
  const { history, loading, error } = useVotingHistory();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Voting History</h2>
        <p className="mt-1 text-slate-600">
          Elections and polls you participated in. Your candidate choice remains
          anonymous.
        </p>
      </div>

      <VotingHistoryTable history={history} loading={loading} error={error} />
    </div>
  );
}
