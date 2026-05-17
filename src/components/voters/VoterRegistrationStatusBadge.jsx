import { VOTER_REGISTRATION_STATUS } from '../../utils/voterRegistrationConstants';

const STYLES = {
  [VOTER_REGISTRATION_STATUS.REGISTERED]:
    'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  [VOTER_REGISTRATION_STATUS.WAITLISTED]:
    'bg-amber-50 text-amber-800 ring-amber-600/20',
  [VOTER_REGISTRATION_STATUS.APPROVED]:
    'bg-blue-50 text-blue-800 ring-blue-600/20',
  [VOTER_REGISTRATION_STATUS.REJECTED]:
    'bg-red-50 text-red-800 ring-red-600/20',
};

export default function VoterRegistrationStatusBadge({ status }) {
  const style =
    STYLES[status] ?? 'bg-slate-50 text-slate-700 ring-slate-600/20';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {status}
    </span>
  );
}
