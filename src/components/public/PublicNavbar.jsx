import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { HiOutlineBars3, HiOutlineShieldCheck, HiOutlineXMark } from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME, ROUTES } from '../../utils/constants';
import { getDashboardPathForRole } from '../../utils/roleHelpers';
import Button from '../ui/Button';

const navLinkClass = ({ isActive }) =>
  [
    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');

const desktopNavLinkClass = ({ isActive }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, role } = useAuth();
  const dashboardPath = getDashboardPathForRole(role);

  const links = [
    { to: ROUTES.HOME, label: 'Home', end: true },
    { to: ROUTES.PUBLIC_ELECTIONS, label: 'Elections' },
    { to: ROUTES.ABOUT, label: 'About' },
    { to: ROUTES.CONTACT, label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to={ROUTES.HOME}
          className="flex items-center gap-2 text-primary-700"
          onClick={() => setOpen(false)}
        >
          <HiOutlineShieldCheck className="h-8 w-8" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={desktopNavLinkClass}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated && dashboardPath ? (
            <Link to={dashboardPath}>
              <Button variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to={ROUTES.CHOOSE_ROLE}>
                <Button variant="secondary" size="sm">
                  Login
                </Button>
              </Link>
              <Link to={ROUTES.CHOOSE_ROLE}>
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? (
            <HiOutlineXMark className="h-6 w-6" />
          ) : (
            <HiOutlineBars3 className="h-6 w-6" />
          )}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {isAuthenticated && dashboardPath ? (
              <Link to={dashboardPath} onClick={() => setOpen(false)}>
                <Button className="w-full" variant="secondary">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to={ROUTES.CHOOSE_ROLE} onClick={() => setOpen(false)}>
                  <Button className="w-full" variant="secondary">
                    Login
                  </Button>
                </Link>
                <Link to={ROUTES.CHOOSE_ROLE} onClick={() => setOpen(false)}>
                  <Button className="w-full">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

