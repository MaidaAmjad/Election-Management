import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineMagnifyingGlass,
  HiOutlineTrash,
  HiOutlineCheck,
} from 'react-icons/hi2';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  READ_FILTER,
} from '../../utils/notificationConstants';
import {
  deleteNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notificationService';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

const TYPE_OPTIONS = [
  { value: NOTIFICATION_TYPES.ALL, label: 'All types' },
  ...Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

const READ_OPTIONS = [
  { value: READ_FILTER.ALL, label: 'All' },
  { value: READ_FILTER.UNREAD, label: 'Unread' },
  { value: READ_FILTER.READ, label: 'Read' },
];

function StatusBadge({ isRead }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isRead ? 'bg-slate-100 text-slate-600' : 'bg-primary-100 text-primary-800'
      }`}
    >
      {isRead ? 'Read' : 'Unread'}
    </span>
  );
}

function DeliveryBadge({ status }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  const cls =
    status === 'Sent'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'Failed'
        ? 'bg-red-100 text-red-800'
        : 'bg-amber-100 text-amber-800';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default function NotificationCenterPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [type, setType] = useState(NOTIFICATION_TYPES.ALL);
  const [readFilter, setReadFilter] = useState(READ_FILTER.ALL);

  const {
    rows,
    total,
    page,
    setPage,
    totalPages,
    loading,
    error,
    refresh,
  } = useNotificationCenter({ search, type, readFilter, pageSize: 12 });

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id);
      toast.success('Marked as read');
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to update');
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNotification(id);
      toast.success('Notification deleted');
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to delete');
    }
  }

  async function handleMarkAllRead() {
    try {
      const count = await markAllNotificationsRead();
      toast.success(count ? `${count} marked as read` : 'All caught up');
      refresh();
    } catch (err) {
      toast.error(err.message ?? 'Failed to mark all read');
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notification Center</h2>
          <p className="mt-1 text-sm text-slate-600">
            View in-app alerts and related email delivery status.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
          Mark all read
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-end">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
          <div className="flex gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Title or message…"
              className="flex-1"
            />
            <Button type="submit" variant="secondary" className="shrink-0 gap-1">
              <HiOutlineMagnifyingGlass className="h-4 w-4" />
              Search
            </Button>
          </div>
        </form>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {READ_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Sent</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Loading notifications…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No notifications match your filters.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.id} className={!row.is_read ? 'bg-primary-50/30' : ''}>
                    <td className="max-w-xs px-4 py-3">
                      <p className="font-medium text-slate-900">{row.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{row.message}</p>
                      {row.election_title && (
                        <p className="mt-1 text-xs text-primary-600">{row.election_title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {NOTIFICATION_TYPE_LABELS[row.type] ?? row.type?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isRead={row.is_read} />
                    </td>
                    <td className="px-4 py-3">
                      <DeliveryBadge status={row.email_delivery_status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatRelativeTime(row.created_at)}
                      {row.email_sent_at && (
                        <span className="block text-[10px] text-slate-400">
                          Email {formatRelativeTime(row.email_sent_at)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {!row.is_read && (
                          <button
                            type="button"
                            onClick={() => handleMarkRead(row.id)}
                            className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-600"
                            title="Mark read"
                          >
                            <HiOutlineCheck className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                          title="Delete"
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              {total} total · Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
