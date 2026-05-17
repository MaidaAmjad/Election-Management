import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronDown,
  HiOutlineCog6Tooth,
} from 'react-icons/hi2';
import { ROUTES } from '../../utils/constants';
import { getRoleLabel } from '../../utils/roleHelpers';

export default function ProfileDropdown({ displayName, email, role, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        <span className="hidden max-w-[120px] truncate font-medium text-slate-800 sm:inline">
          {displayName}
        </span>
        <HiOutlineChevronDown className="h-4 w-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-500">{email}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary-600">
              {getRoleLabel(role)}
            </p>
          </div>
          <Link
            to={ROUTES.SETTINGS}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <HiOutlineCog6Tooth className="h-4 w-4" /> Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
