import { Link } from 'react-router-dom';
import { HiOutlineShieldCheck } from 'react-icons/hi2';
import { APP_NAME } from '../../utils/constants';

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
  className = '',
}) {
  return (
    <div className={`w-full max-w-md ${className}`.trim()}>
      <div className="mb-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary-700 transition-colors hover:text-primary-800"
        >
          <HiOutlineShieldCheck className="h-8 w-8" aria-hidden="true" />
          <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          )}
        </div>

        {children}
      </div>

      {footer && <div className="mt-6 text-center text-sm">{footer}</div>}
    </div>
  );
}
