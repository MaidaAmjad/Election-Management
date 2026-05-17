import { HiOutlineLockClosed } from 'react-icons/hi2';
import { RESULT_STATUS } from '../../utils/resultsConstants';

export default function ResultsLockedBanner({ election, isAdmin, onUnlock, unlocking }) {
  if (!election?.result_locked && election?.result_status !== RESULT_STATUS.LOCKED) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-300 bg-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-800">
        <HiOutlineLockClosed className="h-5 w-5" aria-hidden />
        <p className="font-medium">Results Locked</p>
      </div>
      {isAdmin && onUnlock && (
        <button
          type="button"
          onClick={onUnlock}
          disabled={unlocking}
          className="text-sm font-medium text-primary-700 hover:text-primary-800 disabled:opacity-50"
        >
          {unlocking ? 'Unlocking…' : 'Unlock results (Super Admin)'}
        </button>
      )}
    </div>
  );
}
