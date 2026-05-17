import MyJoinedElectionsList from '../../components/voters/MyJoinedElectionsList';
import { useAuth } from '../../hooks/useAuth';
import { useVoterJoinedElections } from '../../hooks/useVoterJoinedElections';

export default function MyJoinedElectionsPage() {
  const { user } = useAuth();
  const { elections, loading, error, cancelRegistration, cancellingId } =
    useVoterJoinedElections(user?.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          My Joined Elections
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Elections you have registered or joined, including waitlist status.
        </p>
      </div>

      <MyJoinedElectionsList
        elections={elections}
        loading={loading}
        error={error}
        onCancel={cancelRegistration}
        cancellingId={cancellingId}
      />
    </div>
  );
}
