import { CREATOR_REQUEST_STATUS } from '../../utils/adminConstants';

const styles = {
  [CREATOR_REQUEST_STATUS.PENDING]: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  [CREATOR_REQUEST_STATUS.APPROVED]: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  [CREATOR_REQUEST_STATUS.REJECTED]: 'bg-red-50 text-red-800 ring-red-600/20',
};

export default function RequestStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ?? 'bg-slate-50 text-slate-700 ring-slate-600/20'
      }`}
    >
      {status}
    </span>
  );
}
