import { Link, NavLink } from 'react-router-dom';
import { HiOutlineShieldCheck } from 'react-icons/hi2';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME, ROUTES } from '../../utils/constants';
import { getDashboardPathForRole } from '../../utils/roleHelpers';
import Button from '../ui/Button';

const navLinkClass = ({ isActive }) =>
  [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  ].join(' ');

export default function Navbar() {
  const { isAuthenticated, signOut, role } = useAuth();
  const dashboardPath = role ? getDashboardPathForRole(role) : ROUTES.LOGIN;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to={ROUTES.HOME}
          className="flex items-center gap-2 text-primary-700 transition-colors hover:text-primary-800"
        >
          <HiOutlineShieldCheck className="h-7 w-7" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink to={ROUTES.HOME} className={navLinkClass} end>
            Home
          </NavLink>

          {isAuthenticated ? (
            <>
              <NavLink to={dashboardPath} className={navLinkClass}>
                Dashboard
              </NavLink>
              <Button
                variant="secondary"
                size="sm"
                onClick={signOut}
                className="ml-2"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <NavLink to={ROUTES.LOGIN} className={navLinkClass}>
                Sign in
              </NavLink>
              <Link to={ROUTES.SIGNUP}>
                <Button size="sm" className="ml-2">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
