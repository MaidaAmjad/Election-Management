import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineBell, HiOutlineCheck, HiOutlineTrash } from 'react-icons/hi2';
import { useNotifications } from '../../hooks/useNotifications';
import { getNotificationCenterPath } from '../../utils/notificationConstants';
import { useAuth } from '../../hooks/useAuth';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

function typeBadgeClass(type) {
  if (type === 'approval') return 'bg-emerald-100 text-emerald-800';
  if (type === 'rejection') return 'bg-red-100 text-red-800';
  if (type === 'secret_id') return 'bg-violet-100 text-violet-800';
  if (type === 'election_reminder') return 'bg-amber-100 text-amber-800';
  if (type === 'result_announced') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}

export default function NotificationBell() {
  const { role } = useAuth();
  const centerPath = getNotificationCenterPath(role);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const {
    items,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    remove,
  } = useNotifications({ limit: 8 });

  useEffect(() => {
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      >
        <HiOutlineBell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                No notifications yet.
              </p>
            )}
            {!loading &&
              items.map((item) => (
                <div
                  key={item.id}
                  className={`border-b border-slate-50 px-4 py-3 ${!item.is_read ? 'bg-primary-50/40' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                        {item.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeBadgeClass(item.type)}`}
                        >
                          {item.type?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!item.is_read && (
                        <button
                          type="button"
                          onClick={() => markRead(item.id)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                          title="Mark as read"
                        >
                          <HiOutlineCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        title="Delete"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="border-t border-slate-100 p-2">
            <Link
              to={centerPath}
              onClick={() => setOpen(false)}
              className="block rounded-lg py-2 text-center text-sm font-medium text-primary-600 hover:bg-primary-50"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
