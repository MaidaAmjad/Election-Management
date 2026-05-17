import { REGISTRATION_STATUS } from '../../utils/finalizationConstants';

const STYLES = {
  [REGISTRATION_STATUS.OPEN]: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  [REGISTRATION_STATUS.LOCKED]: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  [REGISTRATION_STATUS.FINALIZED]: 'bg-slate-100 text-slate-800 ring-slate-600/20',
};

export default function RegistrationStatusBadge({ status }) {
  const style = STYLES[status] ?? 'bg-slate-50 text-slate-700 ring-slate-600/20';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {status ?? 'Unknown'}
    </span>
  );
}
