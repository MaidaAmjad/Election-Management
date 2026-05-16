import { Outlet } from 'react-router-dom';
import { HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';
import { getRoleLabel } from '../utils/roleHelpers';
import Button from '../components/ui/Button';

export default function DashboardLayout({ title }) {
  const { profile, role, user, signOut } = useAuth();
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

          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-slate-600 sm:block">
              {displayName}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={signOut}
              className="gap-2"
            >
              <HiOutlineArrowRightOnRectangle className="h-4 w-4" aria-hidden="true" />
              Sign out
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
