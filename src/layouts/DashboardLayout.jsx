import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import { ROUTES, USER_ROLES } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { getRoleLabel, hasRole } from '../utils/roleHelpers';
import Button from '../components/ui/Button';

export default function DashboardLayout({ title }) {
  const { profile, role, user } = useAuth();
  const handleLogout = useLogout();
  const displayName = profile?.full_name ?? user?.email ?? 'User';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
              {getRoleLabel(role)}
            </p>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <p className="hidden text-sm text-slate-600 sm:block">
              {displayName}
            </p>
            <Link
              to={ROUTES.SETTINGS}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <HiOutlineCog6Tooth className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <HiOutlineArrowRightOnRectangle className="h-4 w-4" aria-hidden="true" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {hasRole(role, [USER_ROLES.SUPER_ADMIN]) && (
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 sm:px-6 lg:px-8">
            <Link
              to={ROUTES.ADMIN_DASHBOARD}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Overview
            </Link>
            <Link
              to={ROUTES.ADMIN_REQUESTS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Creator requests
            </Link>
            <Link
              to={ROUTES.ADMIN_APPROVED_ELECTIONS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Approved elections
            </Link>
            <Link
              to={ROUTES.ADMIN_ACTIVITY_LOGS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Activity logs
            </Link>
            <Link
              to={ROUTES.ADMIN_FINALIZED_VOTERS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Finalized voters
            </Link>
            <Link
              to={ROUTES.ADMIN_SECRET_IDS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Secret IDs
            </Link>
          </div>
        </nav>
      )}

      {hasRole(role, [USER_ROLES.VOTER]) && (
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 sm:px-6 lg:px-8">
            <NavLink
              to={ROUTES.VOTER_DASHBOARD}
              end
              className={({ isActive }) =>
                [
                  'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              Overview
            </NavLink>
            <NavLink
              to={ROUTES.VOTER_JOINED_ELECTIONS}
              className={({ isActive }) =>
                [
                  'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              My joined elections
            </NavLink>
            <NavLink
              to={ROUTES.VOTER_SECRET_IDS}
              className={({ isActive }) =>
                [
                  'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              My secret IDs
            </NavLink>
            <NavLink
              to={ROUTES.VOTER_VOTE}
              className={({ isActive }) =>
                [
                  'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              Vote
            </NavLink>
            <NavLink
              to={ROUTES.VOTER_VOTING_HISTORY}
              className={({ isActive }) =>
                [
                  'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              Voting history
            </NavLink>
            <Link
              to={ROUTES.PUBLIC_ELECTIONS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Browse elections
            </Link>
          </div>
        </nav>
      )}

      {hasRole(role, [USER_ROLES.ELECTION_CREATOR]) && (
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 sm:px-6 lg:px-8">
            <NavLink
              to={ROUTES.CREATOR_DASHBOARD}
              end
              className={({ isActive }) =>
                [
                  'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              My elections
            </NavLink>
            <NavLink
              to={ROUTES.CREATOR_CANDIDATES}
              className={({ isActive }) =>
                [
                  'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                ].join(' ')
              }
            >
              Candidates
            </NavLink>
            <Link
              to={`${ROUTES.CREATOR_DASHBOARD}/elections/new`}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Create election
            </Link>
            <Link
              to={`${ROUTES.CREATOR_CANDIDATES}/new`}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Add candidate
            </Link>
            <Link
              to={ROUTES.CREATOR_FINALIZED_VOTERS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Finalized voters
            </Link>
            <Link
              to={ROUTES.CREATOR_SECRET_IDS}
              className="border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900"
            >
              Secret IDs
            </Link>
          </div>
        </nav>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
