import { NavLink } from 'react-router-dom';
import { HiOutlineShieldCheck, HiOutlineXMark, HiOutlineBars3 } from 'react-icons/hi2';
import { APP_NAME } from '../../utils/constants';
import { DASHBOARD_NAV } from '../../utils/dashboardNavConfig';

export default function DashboardSidebar({ role, mobileOpen, onMobileClose }) {
  const items = DASHBOARD_NAV[role] ?? [];

  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      isActive
        ? 'bg-primary-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    ].join(' ');

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={linkClass}
          onClick={onMobileClose}
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          aria-label="Close menu"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2 text-primary-700">
            <HiOutlineShieldCheck className="h-8 w-8" />
            <span className="text-sm font-bold">{APP_NAME}</span>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={onMobileClose}
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}

export function DashboardSidebarToggle({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      aria-label="Open menu"
    >
      <HiOutlineBars3 className="h-6 w-6" />
    </button>
  );
}
