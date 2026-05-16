import { PUBLIC_ELECTION_STATUS } from '../../utils/publicElectionConstants';

const styles = {
  [PUBLIC_ELECTION_STATUS.UPCOMING]: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  [PUBLIC_ELECTION_STATUS.ACTIVE]: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  [PUBLIC_ELECTION_STATUS.COMPLETED]: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export default function PublicStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ?? styles[PUBLIC_ELECTION_STATUS.UPCOMING]
      }`}
    >
      {status}
    </span>
  );
}

