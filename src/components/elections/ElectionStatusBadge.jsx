import { ELECTION_STATUS } from '../../utils/electionConstants';

const styles = {
  [ELECTION_STATUS.DRAFT]: 'bg-slate-100 text-slate-700',
  [ELECTION_STATUS.PUBLISHED]: 'bg-blue-100 text-blue-800',
  [ELECTION_STATUS.ACTIVE]: 'bg-emerald-100 text-emerald-800',
  [ELECTION_STATUS.COMPLETED]: 'bg-violet-100 text-violet-800',
};

export default function ElectionStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status] ?? styles[ELECTION_STATUS.DRAFT]}`}
    >
      {status}
    </span>
  );
}
