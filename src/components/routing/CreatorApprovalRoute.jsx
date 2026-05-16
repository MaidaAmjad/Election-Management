import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchLatestCreatorRequestByUserId,
  isCreatorApproved,
} from '../../services/creatorRequestService';
import { getCreatorDashboardPath } from '../../utils/creatorAccess';
import RouteLoader from './RouteLoader';

export default function CreatorApprovalRoute() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function check() {
      setLoading(true);
      try {
        const request = await fetchLatestCreatorRequestByUserId(user.id);
        if (cancelled) return;

        if (isCreatorApproved(request)) {
          setApproved(true);
          setRedirectPath(null);
        } else {
          setApproved(false);
          setRedirectPath(getCreatorDashboardPath(request));
        }
      } catch {
        if (!cancelled) {
          setApproved(false);
          setRedirectPath(getCreatorDashboardPath(null));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) {
    return <RouteLoader />;
  }

  if (!approved && redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
