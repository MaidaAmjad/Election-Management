import { Link } from 'react-router-dom';
import { HiOutlineArrowLeft } from 'react-icons/hi2';
import MySecretIdsList from '../../components/secretid/MySecretIdsList';
import { useMySecretIds } from '../../hooks/useMySecretIds';
import { ROUTES } from '../../utils/constants';

export default function MySecretIdsPage() {
  const { rows, loading, error } = useMySecretIds();

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={ROUTES.VOTER_DASHBOARD}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">My Secret Voting IDs</h2>
        <p className="mt-1 text-slate-600">
          Masked IDs for elections you joined. Your full ID was sent by email.
        </p>
      </div>

      <MySecretIdsList rows={rows} loading={loading} error={error} />
    </div>
  );
}
