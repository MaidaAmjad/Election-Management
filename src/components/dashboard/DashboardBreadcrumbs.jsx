import { Link, useLocation } from 'react-router-dom';
import { HiOutlineChevronRight, HiOutlineHome } from 'react-icons/hi2';

const LABELS = {
  'admin-dashboard': 'Admin',
  'creator-dashboard': 'Creator',
  'voter-dashboard': 'Voter',
  elections: 'Elections',
  candidates: 'Candidates',
  results: 'Results',
  audit: 'Audit',
  notifications: 'Notifications',
  requests: 'Requests',
  'secret-ids': 'Secret IDs',
  'finalized-voters': 'Finalized voters',
  vote: 'Vote',
  'voting-history': 'Voting history',
  'joined-elections': 'Joined polls',
};

function segmentLabel(segment) {
  return LABELS[segment] ?? segment.replace(/-/g, ' ');
}

export default function DashboardBreadcrumbs({ homeTo }) {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  if (parts.length <= 1) return null;

  const crumbs = parts.map((part, index) => ({
    label: segmentLabel(part),
    path: `/${parts.slice(0, index + 1).join('/')}`,
    isLast: index === parts.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-sm text-slate-500">
      <Link to={homeTo} className="inline-flex items-center hover:text-primary-600">
        <HiOutlineHome className="h-4 w-4" />
      </Link>
      {crumbs.slice(1).map((crumb) => (
        <span key={crumb.path} className="inline-flex items-center gap-1">
          <HiOutlineChevronRight className="h-3 w-3" />
          {crumb.isLast ? (
            <span className="font-medium text-slate-800 capitalize">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="capitalize hover:text-primary-600">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
