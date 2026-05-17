import NotificationBell from '../notifications/NotificationBell';
import ProfileDropdown from './ProfileDropdown';
import { DashboardSidebarToggle } from './DashboardSidebar';

export default function DashboardNavbar({
  title,
  displayName,
  email,
  role,
  onLogout,
  onMenuOpen,
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <DashboardSidebarToggle onClick={onMenuOpen} />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />
        <ProfileDropdown
          displayName={displayName}
          email={email}
          role={role}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
