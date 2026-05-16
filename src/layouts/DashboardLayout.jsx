import { Link, Outlet } from 'react-router-dom';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import { ROUTES } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { getRoleLabel } from '../utils/roleHelpers';
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

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
