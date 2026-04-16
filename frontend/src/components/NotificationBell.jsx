import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Heart, Bookmark, UserPlus } from 'lucide-react';
import safeFetch from '../lib/safeFetch';

const API = '/api';

const ICON_MAP = {
  like: Heart,
  bookmark: Bookmark,
  follow: UserPlus,
};

const COLOR_MAP = {
  like: 'text-red-400',
  bookmark: 'text-orange-400',
  follow: 'text-blue-400',
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function NotifItem({ n }) {
  const Icon = ICON_MAP[n.type] || Bell;
  const color = COLOR_MAP[n.type] || 'text-gray-400';

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 hover:bg-[#1f1f22] transition-colors ${!n.read ? 'bg-[#1a1a1c]' : ''}`}
      data-testid={`notification-${n.notification_id}`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {n.actor_picture ? (
          <img src={n.actor_picture.startsWith('/api') ? n.actor_picture : n.actor_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-[#252528] flex items-center justify-center ${color}`}>
            <Icon size={14} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-300 text-sm leading-snug">{n.message}</p>
        <p className="text-gray-600 text-xs mt-0.5">{timeAgo(n.created_at)}</p>
      </div>
      {!n.read && (
        <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-2" />
      )}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await safeFetch(`${API}/social/notifications/unread-count`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnread(data.unread_count || 0);
      }
    } catch {}
  }, []);

  // Poll unread count every 15s
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const fetchNotifications = async () => {
    try {
      const res = await safeFetch(`${API}/social/notifications?limit=20`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {}
  };

  const markRead = async () => {
    if (unread === 0) return;
    try {
      await safeFetch(`${API}/social/notifications/read`, { method: 'PUT', credentials: 'include' });
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleToggle = async () => {
    if (!open) {
      await fetchNotifications();
      markRead();
    }
    setOpen(prev => !prev);
  };

  // Close on outside click
  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative p-1.5 text-gray-700 hover:text-gray-900 transition-colors"
        data-testid="notification-bell"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold w-4.5 h-4.5 min-w-[18px] rounded-full flex items-center justify-center leading-none" data-testid="notification-badge">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#141416] border border-gray-800 rounded-lg shadow-2xl z-50 overflow-hidden" data-testid="notification-dropdown">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <h4 className="text-white font-semibold text-sm">Notifications</h4>
            {notifications.length > 0 && (
              <span className="text-gray-500 text-xs">{notifications.length} total</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell size={28} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => <NotifItem key={n.notification_id} n={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
