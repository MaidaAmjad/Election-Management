import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineShieldCheck } from 'react-icons/hi2';
import RoleCard from '../components/auth/RoleCard';
import Button from '../components/ui/Button';
import { APP_NAME, ROUTES, USER_ROLES } from '../utils/constants';
import { ROLE_OPTIONS } from '../utils/roleConfig';
import { getSelectedRole, setSelectedRole } from '../utils/roleStorage';

export default function RoleSelection() {
  const [selected, setSelected] = useState(() => getSelectedRole());

  function handleSelect(role) {
    setSelected(role);
    setSelectedRole(role);
  }

  const selectedOption = ROLE_OPTIONS.find((option) => option.role === selected);
  const isSuperAdmin = selected === USER_ROLES.SUPER_ADMIN;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/40 to-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to={ROUTES.HOME}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary-700"
        >
          <HiOutlineArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>

        <div className="mt-8 text-center">
          <Link
            to={ROUTES.HOME}
            className="inline-flex items-center gap-2 text-primary-700"
          >
            <HiOutlineShieldCheck className="h-8 w-8" aria-hidden="true" />
            <span className="text-xl font-bold">{APP_NAME}</span>
          </Link>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Choose Your Role
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Select how you will use the platform. You will sign in or register
            with the role you choose.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {ROLE_OPTIONS.map((option) => (
            <RoleCard
              key={option.role}
              title={option.title}
              description={option.description}
              icon={option.icon}
              accent={option.accent}
              ring={option.ring}
              selected={selected === option.role}
              onSelect={() => handleSelect(option.role)}
            />
          ))}
        </div>

        {selectedOption && (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all">
            <p className="text-center text-sm font-medium text-slate-500">
              Selected role
            </p>
            <p className="mt-1 text-center text-xl font-bold text-slate-900">
              {selectedOption.title}
            </p>

            {isSuperAdmin && (
              <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
                Admin accounts are created by the system.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to={ROUTES.LOGIN} className="flex-1">
                <Button className="w-full" size="lg">
                  Login
                </Button>
              </Link>

              {!isSuperAdmin && (
                <Link to={ROUTES.SIGNUP} className="flex-1">
                  <Button variant="secondary" className="w-full" size="lg">
                    Sign up
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {!selected && (
          <p className="mt-10 text-center text-sm text-slate-500">
            Click a card above to continue to login or sign up.
          </p>
        )}
      </div>
    </div>
  );
}
