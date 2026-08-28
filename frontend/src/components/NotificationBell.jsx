import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationApi } from '../services/notificationApi.js';
import { getSocket } from '../services/socket.js';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    notificationApi.list().then((res) => {
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    });

    const socket = getSocket();
    if (!socket) return undefined;

    function onNotification(n) {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    }
    socket.on('notification', onNotification);
    return () => socket.off('notification', onNotification);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
  }

  async function handleClickNotification(n) {
    if (!n.isRead) {
      await notificationApi.markRead(n._id);
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleOpen} className="relative rounded-full p-2 text-ink hover:bg-slate-soft/60" aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold text-paper">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate/15 bg-paper-raised shadow-lg">
          <div className="flex items-center justify-between border-b border-slate/15 px-4 py-3">
            <p className="text-sm font-medium text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-brass hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate">Nothing yet.</p>}
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleClickNotification(n)}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-slate/10 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-soft/40 ${
                  n.isRead ? '' : 'bg-brass-soft/20'
                }`}
              >
                <p className="text-sm font-medium text-ink">{n.title}</p>
                {n.body && <p className="text-xs text-slate">{n.body}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
