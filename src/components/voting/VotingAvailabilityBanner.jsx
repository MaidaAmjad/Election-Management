import { HiOutlineClock, HiOutlineLockClosed } from 'react-icons/hi2';
import { VOTING_PHASE } from '../../utils/votingConstants';
import { getVotingPhaseMessage } from '../../utils/votingAvailability';

export default function VotingAvailabilityBanner({ phase }) {
  const message = getVotingPhaseMessage(phase);

  if (!message || phase === VOTING_PHASE.OPEN) {
    return null;
  }

  const isNotStarted = phase === VOTING_PHASE.NOT_STARTED;

  return (
    <div
      className={[
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
        isNotStarted
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-slate-200 bg-slate-100 text-slate-800',
      ].join(' ')}
      role="status"
    >
      {isNotStarted ? (
        <HiOutlineClock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <HiOutlineLockClosed className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      )}
      <p className="font-medium">{message}</p>
    </div>
  );
}
