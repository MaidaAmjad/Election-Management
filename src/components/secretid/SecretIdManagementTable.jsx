import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import MaskedSecretId from './MaskedSecretId';
import SecretEmailStatusBadge from './SecretEmailStatusBadge';
import SecretIdDetailModal from './SecretIdDetailModal';
import RegenerateSecretIdModal from './RegenerateSecretIdModal';
import { formatElectionDate } from '../../utils/electionFormatters';
import {
  regenerateSecretId,
  sendSecretIdEmail,
} from '../../services/secretIdService';
import { SECRET_EMAIL_STATUS } from '../../utils/secretIdConstants';

export default function SecretIdManagementTable({
  electionTitle,
  rows,
  paginated,
  loading,
  search,
  onSearchChange,
  emailStatus,
  onEmailStatusChange,
  pollId,
  onPollIdChange,
  pollOptions,
  page,
  onPageChange,
  totalPages,
  totalFiltered,
  isAdmin,
  onRefresh,
}) {
  const [detailRow, setDetailRow] = useState(null);
  const [regenerateRow, setRegenerateRow] = useState(null);
  const [actionId, setActionId] = useState(null);

  async function handleResend(row) {
    setActionId(row.id);
    try {
      const result = await sendSecretIdEmail(row.id);
      if (result.failed) {
        toast.error('Email failed to send.');
      } else {
        toast.success('Secret ID email sent.');
      }
      onRefresh?.();
    } catch (err) {
      toast.error(err.message ?? 'Could not send email.');
    } finally {
      setActionId(null);
    }
  }

  async function handleRegenerate() {
    if (!regenerateRow) return;
    setActionId(regenerateRow.id);
    try {
      const result = await regenerateSecretId(regenerateRow.id);
      if (!result?.success) {
        toast.error(result?.message ?? 'Regeneration failed.');
        return;
      }
      toast.success(result.message ?? 'ID regenerated.');
      if (result.new_row_id) {
        await sendSecretIdEmail(result.new_row_id);
        toast.success('Updated ID emailed to voter.');
      }
      setRegenerateRow(null);
      onRefresh?.();
    } catch (err) {
      toast.error(err.message ?? 'Regeneration failed.');
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <label className="block text-xs font-medium uppercase text-slate-500">
            Search
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name, email, poll…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-slate-500">
            Email status
          </label>
          <select
            value={emailStatus}
            onChange={(e) => onEmailStatusChange(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value={SECRET_EMAIL_STATUS.PENDING}>Pending</option>
            <option value={SECRET_EMAIL_STATUS.SENT}>Sent</option>
            <option value={SECRET_EMAIL_STATUS.FAILED}>Failed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-slate-500">
            Poll
          </label>
          <select
            value={pollId}
            onChange={(e) => onPollIdChange(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="all">All polls</option>
            {pollOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Voter</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Poll</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Secret ID</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Generated</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No secret IDs match your filters.
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.voter_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{row.poll_title}</td>
                  <td className="px-4 py-3">
                    <MaskedSecretId maskedValue={row.masked_secret_id} />
                  </td>
                  <td className="px-4 py-3">
                    <SecretEmailStatusBadge status={row.email_status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatElectionDate(row.generated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailRow(row)}
                      >
                        View
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResend(row)}
                        disabled={actionId === row.id}
                        isLoading={actionId === row.id}
                      >
                        Resend
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-700"
                          onClick={() => setRegenerateRow(row)}
                          disabled={actionId === row.id}
                        >
                          Regenerate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>
            Page {page} of {totalPages} ({totalFiltered} records)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <SecretIdDetailModal
        open={Boolean(detailRow)}
        onClose={() => setDetailRow(null)}
        row={detailRow}
        electionTitle={electionTitle}
      />

      <RegenerateSecretIdModal
        open={Boolean(regenerateRow)}
        onClose={() => setRegenerateRow(null)}
        onConfirm={handleRegenerate}
        submitting={Boolean(actionId)}
        voterName={regenerateRow?.voter_name}
      />
    </>
  );
}
