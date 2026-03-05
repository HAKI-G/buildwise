import { useState, useEffect } from 'react';
import { Megaphone, Send, Users, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';
import { useAuditLog } from '../hooks/useAuditLog';

const Announcements = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const notify = useNotification();
  const { logAction, LOG_TYPES } = useAuditLog();

  useEffect(() => {
    fetchUsers();
    // Load history from localStorage
    const saved = localStorage.getItem('announcementHistory');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const audienceCount = targetRole === 'all'
    ? users.length
    : users.filter(u => u.role === targetRole).length;

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      notify.warning('Please fill in both subject and message');
      return;
    }

    notify.confirm(
      `Send announcement "${subject}" to ${audienceCount} user${audienceCount !== 1 ? 's' : ''}?`,
      async () => {
        try {
          setSending(true);

          if (targetRole === 'all') {
            // Broadcast to everyone
            await api.post('/notifications/send', {
              type: 'ANNOUNCEMENT',
              title: `📢 ${subject}`,
              message: message,
              metadata: { announcementType: 'broadcast', sentBy: 'Admin' },
            });
          } else {
            // Send to each user with matching role
            const targetUsers = users.filter(u => u.role === targetRole);
            await Promise.all(
              targetUsers.map(u =>
                api.post('/notifications/send', {
                  type: 'ANNOUNCEMENT',
                  title: `📢 ${subject}`,
                  message: message,
                  metadata: { announcementType: 'role-targeted', role: targetRole, sentBy: 'Admin' },
                  specificUserId: u.userId,
                })
              )
            );
          }

          await logAction(
            LOG_TYPES.SETTINGS_UPDATED || 'ANNOUNCEMENT_SENT',
            `Admin broadcast: "${subject}" to ${targetRole === 'all' ? 'all users' : targetRole + 's'} (${audienceCount} recipients)`,
            { status: 'SUCCESS' }
          );

          const entry = {
            id: Date.now(),
            subject,
            message,
            target: targetRole === 'all' ? 'All Users' : targetRole,
            recipients: audienceCount,
            sentAt: new Date().toISOString(),
          };
          const updated = [entry, ...history].slice(0, 20);
          setHistory(updated);
          localStorage.setItem('announcementHistory', JSON.stringify(updated));

          setSubject('');
          setMessage('');
          setTargetRole('all');
          notify.success(`Announcement sent to ${audienceCount} user${audienceCount !== 1 ? 's' : ''}`);
        } catch (err) {
          console.error('Failed to send announcement:', err);
          notify.error('Failed to send announcement');
        } finally {
          setSending(false);
        }
      },
      { title: 'Confirm Announcement', confirmText: 'Send Now', cancelText: 'Cancel' }
    );
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-orange-500" />
          Announcements
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Broadcast notifications to all users or specific roles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Compose Announcement</h2>

          {/* Target audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Audience
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Users' },
                { value: 'Project Manager', label: 'Project Managers' },
                { value: 'Site Engineer', label: 'Site Engineers' },
                { value: 'Vice President', label: 'Vice Presidents' },
                { value: 'Admin', label: 'Admins' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTargetRole(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    targetRole === opt.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {audienceCount} recipient{audienceCount !== 1 ? 's' : ''} will receive this
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Scheduled Maintenance Tonight"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your announcement message..."
              rows={5}
              maxLength={500}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">{message.length}/500</p>
          </div>

          {/* Preview */}
          {(subject || message) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Preview</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">📢 {subject || '(no subject)'}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{message || '(no message)'}</p>
            </div>
          )}

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Announcement
              </>
            )}
          </button>
        </div>

        {/* History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" /> Sent History
          </h2>
          {history.length > 0 ? (
            <div className="space-y-3 max-h-[520px] overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-none">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.subject}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{h.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {h.recipients} sent
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{h.target}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(h.sentAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Megaphone className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No announcements sent yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
