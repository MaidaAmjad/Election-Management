import Spinner from '../../components/ui/Spinner';
import VotableElectionsList from '../../components/voting/VotableElectionsList';
import { useVotableElections } from '../../hooks/useVotableElections';

export default function VoterVoteListPage() {
  const { elections, loading, error, refresh } = useVotableElections();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cast your vote</h2>
          <p className="mt-1 text-slate-600">
            Vote in finalized elections during the active voting period using your
            secret ID.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && <VotableElectionsList elections={elections} />}
    </div>
  );
}
