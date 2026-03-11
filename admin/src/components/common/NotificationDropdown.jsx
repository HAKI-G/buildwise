import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCheck, Inbox, Bell, Trash2 } from 'lucide-react';

const NotificationDropdown = ({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead, onDelete, loading }) => {
  const dropdownRef = useRef(null);
  const [tab, setTab] = useState('new'); // 'new' | 'read'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Reset to 'new' tab when opening
  useEffect(() => {
    if (isOpen) setTab('new');
  }, [isOpen]);

  if (!isOpen) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'PROJECT_CREATED': case 'project_created': return '📁';
      case 'PROJECT_UPDATED': case 'project_updated': return '📝';
      case 'PROJECT_DELETED': case 'project_deleted': return '🗑️';
      case 'project_status': return '🔄';
      case 'USER_CREATED': case 'user_created': return '👤';
      case 'USER_ROLE_CHANGED': case 'role_changed': return '🔑';
      case 'SYSTEM_ALERT': case 'system': return '⚠️';
      case 'maintenance': return '🔧';
      case 'comment': case 'team_message': return '💬';
      case 'milestone_created': case 'phase_created': return '🎯';
      case 'phase_completed': return '✅';
      case 'expense': case 'budget_alert': return '💰';
      default: return '🔔';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notifTime = new Date(timestamp);
    const diff = Math.floor((now - notifTime) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return notifTime.toLocaleDateString();
  };

  const unreadNotifs = notifications.filter(n => !n.read);
  const readNotifs = notifications.filter(n => n.read);
  const unreadCount = unreadNotifs.length;
  const readCount = readNotifs.length;
  const filteredNotifications = tab === 'new' ? unreadNotifs : readNotifs;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[30rem] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              title="Mark all as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}
        </div>
        {/* Chip Tabs */}
        <div className="flex gap-2 mt-2.5">
          <button
            onClick={() => setTab('new')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              tab === 'new'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            New{unreadCount > 0 && ` (${unreadCount})`}
          </button>
          <button
            onClick={() => setTab('read')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              tab === 'read'
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 ring-1 ring-gray-300 dark:ring-gray-500'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Read{readCount > 0 && ` (${readCount})`}
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto max-h-72">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.slice(0, 30).map((notification) => (
            <div
              key={`${notification.notificationId}-${notification.timestamp}`}
              onClick={() => !notification.read && onMarkAsRead && onMarkAsRead(notification)}
              className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 text-lg mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {formatTime(notification.timestamp || notification.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-10 text-center">
            {tab === 'new' ? (
              <>
                <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">All caught up!</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">No new notifications</p>
              </>
            ) : (
              <>
                <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No read notifications</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">Cleared notifications appear here</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
        <button
          onClick={() => { onClose(); window.location.href = '/settings'; }}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium w-full text-center"
        >
          Notification preferences
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;