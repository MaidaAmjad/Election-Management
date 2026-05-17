import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import { getDashboardPathForRole } from '../utils/roleHelpers';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardNavbar from '../components/dashboard/DashboardNavbar';
import DashboardBreadcrumbs from '../components/dashboard/DashboardBreadcrumbs';
import { useScheduledEmailProcessor } from '../hooks/useScheduledEmailProcessor';

export default function DashboardShellLayout({ title }) {
  const { profile, role, user } = useAuth();
  const handleLogout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  useScheduledEmailProcessor(Boolean(user?.id));

  const displayName = profile?.full_name ?? user?.email ?? 'User';
  const homeTo = getDashboardPathForRole(role);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar
        role={role}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
        <DashboardNavbar
          title={title}
          displayName={displayName}
          email={user?.email}
          role={role}
          onLogout={handleLogout}
          onMenuOpen={() => setMobileOpen(true)}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <DashboardBreadcrumbs homeTo={homeTo} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
