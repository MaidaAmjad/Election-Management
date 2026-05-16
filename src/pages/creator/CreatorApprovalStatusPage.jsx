import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineClock,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import RequestStatusBadge from '../../components/admin/RequestStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useLogout } from '../../hooks/useLogout';
import { fetchLatestCreatorRequestByUserId } from '../../services/creatorRequestService';
import { ROUTES } from '../../utils/constants';
import { formatElectionDate } from '../../utils/electionFormatters';

export default function CreatorApprovalStatusPage({ variant = 'pending' }) {
  const { user } = useAuth();
  const handleLogout = useLogout();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const isRejected = variant === 'rejected';

  useEffect(() => {
    if (!user?.id) return;

    fetchLatestCreatorRequestByUserId(user.id)
      .then(setRequest)
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  const Icon = isRejected ? HiOutlineXCircle : HiOutlineClock;
  const title = isRejected
    ? 'Request rejected'
    : 'Awaiting admin approval';
  const description = isRejected
    ? 'Your election creator application was not approved.'
    : 'Your election creator request is pending review by a Super Admin.';

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div
          className={`mx-auto mb-4 inline-flex rounded-full p-3 ${
            isRejected ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          <Icon className="h-10 w-10" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-slate-600">{description}</p>

        {request && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700">Status</span>
              <RequestStatusBadge status={request.status} />
            </div>
            <p className="mt-3 text-slate-600">
              <span className="font-medium text-slate-800">Organization:</span>{' '}
              {request.organization}
            </p>
            <p className="mt-1 text-slate-600">
              <span className="font-medium text-slate-800">Submitted:</span>{' '}
              {formatElectionDate(request.created_at)}
            </p>
            {isRejected && request.rejection_reason && (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
                <span className="font-semibold">Reason:</span>{' '}
                {request.rejection_reason}
              </p>
            )}
          </div>
        )}

        {!isRejected && (
          <p className="mt-4 text-sm text-slate-500">
            You will receive an email when your request is approved or rejected.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to={ROUTES.CHOOSE_ROLE}>
          <Button variant="secondary">Choose another role</Button>
        </Link>
        <Button variant="secondary" onClick={handleLogout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
