import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import StatCard from '../../components/admin/StatCard';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import { fetchCreatorRequestStats } from '../../services/creatorRequestService';
import { ROUTES } from '../../utils/constants';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCreatorRequestStats();
        setStats(data);
      } catch (err) {
        setError(err.message ?? 'Failed to load dashboard stats.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Admin approval dashboard</h2>
        <p className="mt-1 text-slate-600">
          Review election creator requests and monitor platform activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending requests"
          value={stats.pending}
          icon={HiOutlineClock}
          accent="amber"
        />
        <StatCard
          label="Approved requests"
          value={stats.approved}
          icon={HiOutlineCheckCircle}
          accent="emerald"
        />
        <StatCard
          label="Rejected requests"
          value={stats.rejected}
          icon={HiOutlineXCircle}
          accent="red"
        />
        <StatCard
          label="Total requests"
          value={stats.total}
          icon={HiOutlineDocumentText}
          accent="slate"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to={ROUTES.ADMIN_REQUESTS}>
          <Button>Review creator requests</Button>
        </Link>
        <Link to={ROUTES.ADMIN_APPROVED_ELECTIONS}>
          <Button variant="secondary">View approved elections</Button>
        </Link>
      </div>
    </div>
  );
}
