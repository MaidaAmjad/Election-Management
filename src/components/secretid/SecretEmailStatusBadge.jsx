import { SECRET_EMAIL_STATUS } from '../../utils/secretIdConstants';

const STYLES = {
  [SECRET_EMAIL_STATUS.PENDING]: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  [SECRET_EMAIL_STATUS.SENT]: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  [SECRET_EMAIL_STATUS.FAILED]: 'bg-red-50 text-red-800 ring-red-600/20',
};

export default function SecretEmailStatusBadge({ status }) {
  const style = STYLES[status] ?? STYLES[SECRET_EMAIL_STATUS.PENDING];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}
