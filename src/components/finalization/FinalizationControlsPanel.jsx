import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import FinalizeVoterListModal from './FinalizeVoterListModal';
import AdminOverrideModal from './AdminOverrideModal';
import RegistrationStatusBadge from './RegistrationStatusBadge';
import {
  adminAddVoter,
  adminLockRegistration,
  adminRemoveVoter,
  adminUnlockRegistration,
  adminUpdateMaxVoters,
  finalizeVoterList,
  searchVoterProfiles,
} from '../../services/voterFinalizationService';
import { REGISTRATION_STATUS } from '../../utils/finalizationConstants';

export default function FinalizationControlsPanel({
  election,
  activeCount,
  isAdmin,
  canFinalize,
  onUpdated,
  removeRequest = null,
  onRemoveRequestHandled,
}) {
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeSubmitting, setFinalizeSubmitting] = useState(false);
  const [overrideAction, setOverrideAction] = useState(null);
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const [maxVotersInput, setMaxVotersInput] = useState('');
  const [voterSearch, setVoterSearch] = useState('');
  const [voterResults, setVoterResults] = useState([]);
  const [selectedVoterId, setSelectedVoterId] = useState('');
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    if (!removeRequest) return;
    setRemoveTarget(removeRequest);
    setOverrideAction('removeVoter');
    onRemoveRequestHandled?.();
  }, [removeRequest, onRemoveRequestHandled]);

  if (!election) return null;

  const status = election.registration_status;
  const isFinalized = status === REGISTRATION_STATUS.FINALIZED;
  const atCapacity = activeCount >= election.max_voters;

  async function handleFinalize() {
    setFinalizeSubmitting(true);
    try {
      const result = await finalizeVoterList(election.id);
      if (!result?.success) {
        toast.error(result?.message ?? 'Could not finalize.');
        return;
      }
      toast.success(result.message ?? 'Voter list finalized.');
      setFinalizeOpen(false);
      onUpdated?.();
    } catch (err) {
      toast.error(err.message ?? 'Could not finalize.');
    } finally {
      setFinalizeSubmitting(false);
    }
  }

  async function handleOverrideSubmit({ reason }) {
    setOverrideSubmitting(true);
    try {
      let result;

      switch (overrideAction) {
        case 'unlock':
          result = await adminUnlockRegistration(election.id, reason);
          break;
        case 'lock':
          result = await adminLockRegistration(election.id, reason);
          break;
        case 'maxVoters':
          result = await adminUpdateMaxVoters(
            election.id,
            Number(maxVotersInput),
            reason,
          );
          break;
        case 'addVoter':
          if (!selectedVoterId) {
            toast.error('Select a voter to add.');
            return false;
          }
          result = await adminAddVoter(election.id, selectedVoterId, reason);
          break;
        case 'removeVoter':
          if (!removeTarget?.voter_id) {
            toast.error('No voter selected.');
            return false;
          }
          result = await adminRemoveVoter(
            election.id,
            removeTarget.voter_id,
            reason,
          );
          break;
        default:
          return false;
      }

      if (!result?.success) {
        toast.error(result?.message ?? 'Override failed.');
        return false;
      }

      toast.success(result.message ?? 'Override applied.');
      setOverrideAction(null);
      setMaxVotersInput('');
      setVoterSearch('');
      setVoterResults([]);
      setSelectedVoterId('');
      setRemoveTarget(null);
      onUpdated?.();
      return true;
    } catch (err) {
      toast.error(err.message ?? 'Override failed.');
      return false;
    } finally {
      setOverrideSubmitting(false);
    }
  }

  async function handleVoterSearch(query) {
    setVoterSearch(query);
    if (query.length < 2) {
      setVoterResults([]);
      return;
    }
    try {
      const results = await searchVoterProfiles(query);
      setVoterResults(results);
    } catch {
      setVoterResults([]);
    }
  }

  function openOverride(action, extra = {}) {
    if (action === 'maxVoters') {
      setMaxVotersInput(String(election.max_voters));
    }
    if (action === 'removeVoter' && extra.voter) {
      setRemoveTarget(extra.voter);
    }
    setOverrideAction(action);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Registration controls
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {activeCount.toLocaleString()} / {election.max_voters.toLocaleString()}{' '}
            registered voters
            {atCapacity && status === REGISTRATION_STATUS.OPEN && (
              <span className="ml-2 text-amber-700">(at capacity)</span>
            )}
          </p>
        </div>
        <RegistrationStatusBadge status={status} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {canFinalize && !isFinalized && (
          <Button onClick={() => setFinalizeOpen(true)}>
            Finalize Voter List
          </Button>
        )}
        {isFinalized && (
          <p className="text-sm font-medium text-slate-600">
            Voter list is finalized and frozen.
          </p>
        )}
      </div>

      {isAdmin && !isFinalized && (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Super Admin overrides
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {status !== REGISTRATION_STATUS.OPEN && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openOverride('unlock')}
              >
                Unlock registration
              </Button>
            )}
            {status !== REGISTRATION_STATUS.LOCKED && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openOverride('lock')}
              >
                Lock registration
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openOverride('maxVoters')}
            >
              Change max voters
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openOverride('addVoter')}
            >
              Add voter manually
            </Button>
          </div>
        </div>
      )}

      <FinalizeVoterListModal
        open={finalizeOpen}
        onClose={() => setFinalizeOpen(false)}
        onConfirm={handleFinalize}
        submitting={finalizeSubmitting}
      />

      <AdminOverrideModal
        open={Boolean(overrideAction)}
        onClose={() => {
          setOverrideAction(null);
          setRemoveTarget(null);
        }}
        action={overrideAction}
        onSubmit={handleOverrideSubmit}
        submitting={overrideSubmitting}
        extraFields={
          <>
            {overrideAction === 'maxVoters' && (
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  New maximum voters
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxVotersInput}
                  onChange={(e) => setMaxVotersInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            {overrideAction === 'addVoter' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Search voter by name or phone
                </label>
                <input
                  type="search"
                  value={voterSearch}
                  onChange={(e) => handleVoterSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {voterResults.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                    {voterResults.map((v) => (
                      <li key={v.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVoterId(v.id);
                            setVoterSearch(v.full_name);
                            setVoterResults([]);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                            selectedVoterId === v.id ? 'bg-primary-50' : ''
                          }`}
                        >
                          {v.full_name} · {v.phone}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {overrideAction === 'removeVoter' && removeTarget && (
              <p className="text-sm text-slate-600">
                Remove <strong>{removeTarget.voter_name}</strong> (
                {removeTarget.email}) from this election?
              </p>
            )}
          </>
        }
      />
    </section>
  );
}
