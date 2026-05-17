import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import {
  deleteNotification,
  fetchMyNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '../services/notificationService';

export function useNotifications({ limit = 15, pollUnread = true } = {}) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const [list, count] = await Promise.all([
        fetchMyNotifications({ limit }),
        pollUnread ? fetchUnreadCount() : Promise.resolve(0),
      ]);
      setItems(list);
      if (pollUnread) setUnreadCount(count);
    } catch (err) {
      setError(err.message ?? 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit, pollUnread]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return subscribeToNotifications(user.id, refresh);
  }, [user?.id, refresh]);

  const markRead = useCallback(
    async (id) => {
      await markNotificationRead(id);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const remove = useCallback(async (id) => {
    const target = items.find((n) => n.id === id);
    await deleteNotification(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }, [items]);

  return {
    items,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
    remove,
  };
}
