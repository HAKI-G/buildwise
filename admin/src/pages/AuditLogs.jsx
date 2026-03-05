import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Archive, RotateCcw, Eye, FileDown, X, CheckCheck, ListChecks } from 'lucide-react';
import auditService from '../services/auditService';
import userService from '../services/userService';
import { useNotification } from '../contexts/NotificationContext';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const notify = useNotification();
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [userEmailCache, setUserEmailCache] = useState({});
  
  // When detail modal opens, fetch user email if missing
  useEffect(() => {
    if (!selectedLog) return;
    const userId = selectedLog.userId;
    if (selectedLog.userEmail || userEmailCache[userId] === 'loading') return;
    if (userEmailCache[userId]) return; // already fetched
    
    setUserEmailCache(prev => ({ ...prev, [userId]: 'loading' }));
    userService.getUserById(userId)
      .then(user => {
        const email = user?.email || user?.data?.email || '';
        setUserEmailCache(prev => ({ ...prev, [userId]: email }));
      })
      .catch(() => {
        setUserEmailCache(prev => ({ ...prev, [userId]: '' }));
      });
  }, [selectedLog]);
  
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogs, setSelectedLogs] = useState(new Set());

  const [stats, setStats] = useState({
    total: 0,
    created: 0,
    updated: 0,
    userActions: 0
  });

  useEffect(() => {
    fetchAuditLogs();
    fetchStats();
  }, [showArchived]);

  const fetchStats = async () => {
    try {
      const response = await auditService.getAllLogs({ limit: 1000, archived: showArchived });
      const allLogs = response.logs || [];
      
      setStats({
        total: allLogs.length,
        created: allLogs.filter(l => l.action?.includes('CREATED')).length,
        updated: allLogs.filter(l => l.action?.includes('UPDATED') || l.action?.includes('STATUS')).length,
        userActions: allLogs.filter(l => l.action?.includes('USER') || l.action?.includes('ROLE') || l.action?.includes('LOGIN') || l.action?.includes('PASSWORD')).length
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setSelectedLogs(new Set());
      const response = await auditService.getAllLogs({ limit: 200, archived: showArchived });
      
      const sortedLogs = (response.logs || []).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setLogs(sortedLogs);
      setLastEvaluatedKey(response.lastEvaluatedKey || null);
      setError(null);
    } catch (err) {
      setError('Failed to fetch audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!lastEvaluatedKey) return;
    try {
      const response = await auditService.getAllLogs({ limit: 100, lastKey: lastEvaluatedKey, archived: showArchived });
      const newLogs = [...logs, ...(response.logs || [])];
      
      const sortedLogs = newLogs.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setLogs(sortedLogs);
      setLastEvaluatedKey(response.lastEvaluatedKey || null);
    } catch (err) {
      setError('Failed to load more logs');
    }
  };

  const handleFilter = async () => {
    try {
      setLoading(true);
      let filteredLogs = [];
      
      if (filterType === 'user' && filterValue.trim()) {
        const allResponse = await auditService.getAllLogs({ limit: 500, archived: showArchived });
        const allLogs = allResponse.logs || [];
        filteredLogs = allLogs.filter(log => 
          log.userName?.toLowerCase().includes(filterValue.toLowerCase()) ||
          log.userEmail?.toLowerCase().includes(filterValue.toLowerCase()) ||
          log.userId?.toLowerCase().includes(filterValue.toLowerCase())
        );
      } else if (filterType === 'action' && filterValue) {
        const allResponse = await auditService.getAllLogs({ limit: 500, archived: showArchived });
        const allLogs = allResponse.logs || [];
        filteredLogs = allLogs.filter(log => log.action === filterValue);
      } else if (filterType === 'dateRange' && dateRange.start && dateRange.end) {
        const allResponse = await auditService.getAllLogs({ limit: 500, archived: showArchived });
        const allLogs = allResponse.logs || [];
        
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        
        filteredLogs = allLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= startDate && logDate <= endDate;
        });
      } else {
        const response = await auditService.getAllLogs({ limit: 200, archived: showArchived });
        filteredLogs = response.logs || [];
      }
      
      const sortedLogs = filteredLogs.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setLogs(sortedLogs);
      setError(null);
    } catch (err) {
      setError('Failed to filter logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveLog = async (log) => {
    notify.confirm('Archive this log? It will be moved to archived logs.', async () => {
      try {
        setArchiving(true);
        await auditService.archiveLog(log.logId, log.timestamp);
        await fetchAuditLogs();
        await fetchStats();
      } catch (err) {
        setError('Failed to archive log');
        console.error(err);
      } finally {
        setArchiving(false);
      }
    }, { title: 'Archive Log', confirmText: 'Archive', cancelText: 'Cancel' });
  };

  const handleUnarchiveLog = async (log) => {
    notify.confirm('Restore this log from archive?', async () => {
      try {
        setArchiving(true);
        await auditService.unarchiveLog(log.logId, log.timestamp);
        await fetchAuditLogs();
        await fetchStats();
      } catch (err) {
        setError('Failed to unarchive log');
        console.error(err);
      } finally {
        setArchiving(false);
      }
    }, { title: 'Restore Log', confirmText: 'Restore', cancelText: 'Cancel' });
  };

  const handleRestoreAll = async () => {
    if (logs.length === 0) {
      notify.warning('No archived logs to restore');
      return;
    }

    notify.confirm(`Restore all ${logs.length} archived log(s)?`, async () => {
      try {
        setArchiving(true);
        
        const logsToRestore = logs.map(log => ({
          logId: log.logId,
          timestamp: log.timestamp
        }));
        
        await Promise.all(
          logsToRestore.map(log => 
            auditService.unarchiveLog(log.logId, log.timestamp)
          )
        );
        
        await fetchAuditLogs();
        await fetchStats();
      } catch (err) {
        setError('Failed to restore all logs');
        console.error(err);
      } finally {
        setArchiving(false);
      }
    }, { title: 'Restore All Logs', confirmText: 'Restore All', cancelText: 'Cancel' });
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      PROJECT_CREATED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      PROJECT_UPDATED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      PROJECT_STATUS_UPDATED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      PROJECT_DELETED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      USER_CREATED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      USER_UPDATED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      USER_DELETED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      USER_LOGIN: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      ROLE_CHANGED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      SETTINGS_UPDATED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      DATA_EXPORT: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      PHOTO_UPLOADED: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      PHOTO_CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      EXPENSE_CREATED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      MILESTONE_UPDATED: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
      PHASE_COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    };
    return colors[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getActionIcon = (action) => {
    if (action?.includes('CREATED')) return '➕';
    if (action?.includes('UPDATED') || action?.includes('STATUS')) return '✏️';
    if (action?.includes('DELETED')) return '🗑️';
    if (action?.includes('LOGIN')) return '🔑';
    if (action?.includes('PHOTO')) return '📷';
    if (action?.includes('EXPENSE')) return '💰';
    if (action?.includes('MILESTONE') || action?.includes('PHASE')) return '🏁';
    if (action?.includes('ROLE')) return '👤';
    if (action?.includes('SETTINGS')) return '⚙️';
    return '📋';
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  // Search-filtered logs
  const displayedLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(log =>
      log.userName?.toLowerCase().includes(q) ||
      log.userEmail?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.actionDescription?.toLowerCase().includes(q) ||
      log.targetId?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const toggleSelectLog = (logId) => {
    setSelectedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLogs.size === displayedLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(displayedLogs.map(l => l.logId)));
    }
  };

  const handleBulkArchive = async () => {
    const selected = logs.filter(l => selectedLogs.has(l.logId));
    if (selected.length === 0) return;

    const action = showArchived ? 'restore' : 'archive';
    notify.confirm(`${showArchived ? 'Restore' : 'Archive'} ${selected.length} selected log(s)?`, async () => {
      try {
        setArchiving(true);
        if (showArchived) {
          await Promise.all(selected.map(log => auditService.unarchiveLog(log.logId, log.timestamp)));
        } else {
          await auditService.bulkArchiveLogs(selected.map(log => ({ logId: log.logId, timestamp: log.timestamp })));
        }
        setSelectedLogs(new Set());
        await fetchAuditLogs();
        await fetchStats();
        notify.success(`${selected.length} log(s) ${action}d successfully`);
      } catch (err) {
        setError(`Failed to ${action} selected logs`);
        console.error(err);
      } finally {
        setArchiving(false);
      }
    }, { title: `${showArchived ? 'Restore' : 'Archive'} Selected`, confirmText: `${showArchived ? 'Restore' : 'Archive'} (${selected.length})`, cancelText: 'Cancel' });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Email', 'Action', 'Description', 'Status', 'Target Resource', 'Target ID', 'IP Address', 'Archived'],
      ...logs.map(log => [
        formatDate(log.timestamp),
        log.userName || '',
        log.userEmail || '',
        log.action || '',
        (log.actionDescription || '').replace(/"/g, '""'),
        log.status || '',
        log.targetResource || log.targetType || '',
        log.targetId || '',
        log.ipAddress || '',
        log.isArchived === 'true' ? 'Yes' : 'No'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${showArchived ? 'archived-' : ''}${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportSelectedLogs = () => {
    const selected = logs.filter(l => selectedLogs.has(l.logId));
    if (selected.length === 0) return;

    const csv = [
      ['Timestamp', 'User', 'Email', 'Action', 'Description', 'Status', 'Target Resource', 'Target ID', 'IP Address'],
      ...selected.map(log => [
        formatDate(log.timestamp),
        log.userName || '',
        log.userEmail || '',
        log.action || '',
        (log.actionDescription || '').replace(/"/g, '""'),
        log.status || '',
        log.targetResource || log.targetType || '',
        log.targetId || '',
        log.ipAddress || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-selected-${selected.length}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSelectedLogs(new Set());
  };

  const ACTION_TYPES = {
    PROJECT_CREATED: 'PROJECT_CREATED',
    PROJECT_UPDATED: 'PROJECT_UPDATED',
    PROJECT_STATUS_UPDATED: 'PROJECT_STATUS_UPDATED',
    PROJECT_DELETED: 'PROJECT_DELETED',
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    ROLE_CHANGED: 'ROLE_CHANGED',
    DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
    PHOTO_UPLOADED: 'PHOTO_UPLOADED',
    PHOTO_CONFIRMED: 'PHOTO_CONFIRMED',
    REPORT_GENERATED: 'REPORT_GENERATED',
    EXPENSE_CREATED: 'EXPENSE_CREATED',
    MILESTONE_UPDATED: 'MILESTONE_UPDATED',
    PHASE_COMPLETED: 'PHASE_COMPLETED',
    SETTINGS_UPDATED: 'SETTINGS_UPDATED',
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Project Audit Logs</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Audit Logs
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {showArchived ? 'Viewing archived logs' : 'Track all system activity and user actions'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setShowArchived(false)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  !showArchived 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                  showArchived 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Archived
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {showArchived && logs.length > 0 && selectedLogs.size === 0 && (
              <button 
                onClick={handleRestoreAll} 
                disabled={archiving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 text-sm"
              >
                ↩ Restore All ({logs.length})
              </button>
            )}
            <button onClick={() => { fetchAuditLogs(); fetchStats(); }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button onClick={exportLogs} disabled={logs.length === 0} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter By</label>
              <select 
                value={filterType} 
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterValue('');
                  setDateRange({ start: '', end: '' });
                }} 
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Logs</option>
                <option value="user">User Name/Email</option>
                <option value="action">Action Type</option>
                <option value="dateRange">Date Range</option>
              </select>
            </div>
            
            {filterType === 'user' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">User Name or Email</label>
                <input 
                  type="text" 
                  value={filterValue} 
                  onChange={(e) => setFilterValue(e.target.value)} 
                  placeholder="Enter name or email" 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" 
                />
              </div>
            )}
            
            {filterType === 'action' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action Type</label>
                <select 
                  value={filterValue} 
                  onChange={(e) => setFilterValue(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Action</option>
                  {Object.values(ACTION_TYPES).map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            )}
            
            {filterType === 'dateRange' && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input 
                    type="datetime-local" 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input 
                    type="datetime-local" 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  />
                </div>
              </>
            )}
            
            <button 
              onClick={handleFilter} 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {loading ? 'Filtering...' : 'Apply Filter'}
            </button>
            
            {filterType !== 'all' && (
              <button 
                onClick={() => {
                  setFilterType('all');
                  setFilterValue('');
                  setDateRange({ start: '', end: '' });
                  fetchAuditLogs();
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total {showArchived ? 'Archived' : 'Active'} Logs
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Items Created</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.created}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Items Updated</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.updated}</p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">User Actions</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.userActions}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {/* Search Bar */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs by user, action, description..."
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              {displayedLogs.length} {displayedLogs.length === 1 ? 'log' : 'logs'}
            </span>
            {/* Select All / Deselect All toggle */}
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex-shrink-0
                border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {selectedLogs.size === displayedLogs.length && displayedLogs.length > 0
                ? <><X className="w-3 h-3" /> Deselect All</>
                : <><ListChecks className="w-3 h-3" /> Select All</>}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {displayedLogs.map((log) => (
                  <tr
                    key={log.logId}
                    onClick={() => toggleSelectLog(log.logId)}
                    className={`transition-colors cursor-pointer select-none ${
                      selectedLogs.has(log.logId)
                        ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-200 dark:ring-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{getTimeAgo(log.timestamp)}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(log.timestamp)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {log.userName ? log.userName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{log.userName || 'Unknown'}</div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500">{log.userId?.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        <span>{getActionIcon(log.action)}</span>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={log.actionDescription}>
                      {log.actionDescription}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {displayedLogs.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {searchQuery ? 'No matching logs' : showArchived ? 'No archived logs' : 'No audit logs found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery 
                  ? 'Try a different search term'
                  : filterType !== 'all' 
                    ? 'No logs match your filter criteria. Try adjusting your filters.' 
                  : showArchived 
                    ? 'You haven\'t archived any logs yet.'
                    : 'No project activity has been logged yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Load More */}
        {lastEvaluatedKey && filterType === 'all' && (
          <div className="flex justify-center mt-6">
            <button 
              onClick={loadMore} 
              disabled={loading} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Load More
                </>
              )}
            </button>
          </div>
        )}

        {/* ───── Floating Bulk Action Bar ───── */}
        {selectedLogs.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-700 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-4 animate-slide-up">
            <div className="flex items-center gap-2 pr-4 border-r border-gray-700 dark:border-gray-500">
              <CheckCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">{selectedLogs.size} selected</span>
            </div>
            {selectedLogs.size < displayedLogs.length && (
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              >
                Select All ({displayedLogs.length})
              </button>
            )}
            <button
              onClick={handleBulkArchive}
              disabled={archiving}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors ${
                showArchived
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {showArchived ? <><RotateCcw className="w-3.5 h-3.5" /> Restore</> : <><Archive className="w-3.5 h-3.5" /> Archive</>}
            </button>
            {selectedLogs.size === 1 && (
              <button
                onClick={() => {
                  const logId = [...selectedLogs][0];
                  const log = logs.find(l => l.logId === logId);
                  if (log) setSelectedLog(log);
                }}
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Details
              </button>
            )}
            <button
              onClick={exportSelectedLogs}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={() => setSelectedLogs(new Set())}
              className="p-1.5 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedLog(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${(() => {
                    const a = selectedLog.action;
                    if (a?.includes('CREATED')) return 'bg-green-500';
                    if (a?.includes('DELETED')) return 'bg-red-500';
                    if (a?.includes('LOGIN')) return 'bg-emerald-500';
                    if (a?.includes('ROLE') || a?.includes('USER')) return 'bg-purple-500';
                    return 'bg-blue-500';
                  })()}`}>
                    <span className="text-xl">{getActionIcon(selectedLog.action)}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {(() => {
                        const a = selectedLog.action;
                        if (a === 'PROJECT_CREATED') return 'Project Created';
                        if (a === 'PROJECT_UPDATED') return 'Project Updated';
                        if (a === 'PROJECT_STATUS_UPDATED') return 'Project Status Changed';
                        if (a === 'PROJECT_DELETED') return 'Project Deleted';
                        if (a === 'USER_CREATED') return 'New User Registered';
                        if (a === 'USER_UPDATED') return 'User Profile Modified';
                        if (a === 'USER_DELETED') return 'User Account Removed';
                        if (a === 'USER_LOGIN') return 'User Logged In';
                        if (a === 'ROLE_CHANGED') return 'User Role Changed';
                        if (a === 'SETTINGS_UPDATED') return 'System Settings Modified';
                        if (a === 'PHOTO_UPLOADED') return 'Photo Uploaded';
                        if (a === 'PHOTO_CONFIRMED') return 'Photo Confirmed';
                        if (a === 'EXPENSE_CREATED') return 'Expense Recorded';
                        if (a === 'MILESTONE_UPDATED') return 'Milestone Updated';
                        if (a === 'PHASE_COMPLETED') return 'Phase Completed';
                        if (a === 'DOCUMENT_UPLOADED') return 'Document Uploaded';
                        if (a === 'DATA_EXPORT') return 'Data Exported';
                        return a?.replace(/_/g, ' ') || 'Activity Logged';
                      })()}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${getActionBadgeColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                      {selectedLog.isArchived === 'true' && (
                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">ARCHIVED</span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)} 
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(90vh-130px)]">

                {/* What Happened - human readable summary */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">What Happened</h4>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {(() => {
                      const a = selectedLog.action;
                      const user = selectedLog.userName || 'Unknown user';
                      const desc = selectedLog.actionDescription || '';
                      const changes = selectedLog.changes || {};
                      const target = selectedLog.targetId ? ` (ID: ${selectedLog.targetId.substring(0, 12)}...)` : '';

                      if (a === 'PROJECT_CREATED') return `${user} created a new project. ${desc}. This project was added to the system and is now visible to assigned team members.`;
                      if (a === 'PROJECT_UPDATED') return `${user} modified project details${target}. ${desc}. ${changes.status ? `Status was changed to "${changes.status}".` : `Fields updated: ${Object.keys(changes).filter(k => changes[k]).join(', ') || 'various fields'}.`}`;
                      if (a === 'PROJECT_STATUS_UPDATED') return `${user} changed the status of a project${target}. ${desc}. This may affect project timelines and team assignments.`;
                      if (a === 'PROJECT_DELETED') return `${user} permanently deleted a project from the system${target}. ${desc}. All associated data has been removed.`;
                      if (a === 'USER_CREATED') return `A new user account was registered. ${desc}. The user will need role assignment from an administrator before accessing project features.`;
                      if (a === 'USER_UPDATED') return `${user} updated their profile${target}. ${changes.passwordChanged ? 'Password was changed. ' : ''}${changes.name ? `Name updated to "${changes.name}". ` : ''}${changes.email ? `Email updated to "${changes.email}". ` : ''}${!changes.name && !changes.email && !changes.passwordChanged ? desc : ''}`;
                      if (a === 'USER_DELETED') return `${user} removed a user account from the system${target}. ${desc}. The user will no longer be able to access BuildWise.`;
                      if (a === 'USER_LOGIN') return `${user} logged into the system. ${desc}. Session was established from their browser.`;
                      if (a === 'ROLE_CHANGED') return `${user} changed a user's role${target}. ${desc}. This affects the user's access permissions and available features.`;
                      if (a === 'SETTINGS_UPDATED') return `${user} modified system settings. ${desc}. Changes may affect all users of the platform.`;
                      if (a === 'PHOTO_UPLOADED') return `${user} uploaded a photo to a project${target}. ${desc}. The photo is pending confirmation.`;
                      if (a === 'PHOTO_CONFIRMED') return `${user} confirmed a project photo${target}. ${desc}. The photo is now verified.`;
                      if (a === 'EXPENSE_CREATED') return `${user} recorded a new expense${target}. ${desc}. This affects the project budget tracking.`;
                      if (a === 'MILESTONE_UPDATED') return `${user} updated a project milestone${target}. ${desc}. This may affect the project timeline.`;
                      if (a === 'PHASE_COMPLETED') return `${user} marked a project phase as completed${target}. ${desc}.`;
                      if (a === 'DATA_EXPORT') return `${user} exported data from the system. ${desc}. Sensitive data may have been downloaded.`;
                      return `${user} performed action: ${desc || a}${target}.`;
                    })()}
                  </p>
                </div>

                {/* Who & When */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Performed By</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow-lg">
                      {selectedLog.userName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedLog.userName || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedLog.userEmail 
                          || (userEmailCache[selectedLog.userId] && userEmailCache[selectedLog.userId] !== 'loading' ? userEmailCache[selectedLog.userId] : null)
                          || (() => {
                            const c = typeof selectedLog.changes === 'string' ? (() => { try { return JSON.parse(selectedLog.changes); } catch { return {}; } })() : (selectedLog.changes || {});
                            return c.email || c.Email || '';
                          })()
                          || (userEmailCache[selectedLog.userId] === 'loading' ? <span className="italic">Loading...</span> : <span className="italic">Email not available</span>)
                        }
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">ID: {selectedLog.userId}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(selectedLog.timestamp)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getTimeAgo(selectedLog.timestamp)}</p>
                    </div>
                  </div>
                </div>

                {/* Changes Made */}
                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (() => {
                  const changes = typeof selectedLog.changes === 'string' ? (() => { try { return JSON.parse(selectedLog.changes); } catch { return {}; } })() : selectedLog.changes;
                  if (Object.keys(changes).length === 0) return null;
                  return (
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-200 dark:border-amber-800/40">
                      <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-3">Exact Changes Made</h4>
                      <div className="space-y-2">
                        {Object.entries(changes).map(([key, value]) => {
                          if (value === null || value === undefined || value === '') return null;
                          const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()).trim();
                          let displayValue = value;
                          if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
                          if (typeof value === 'object') displayValue = JSON.stringify(value);
                          return (
                            <div key={key} className="flex items-start gap-3 py-1.5 border-b border-amber-100 dark:border-amber-900/30 last:border-0">
                              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 min-w-[120px] flex-shrink-0">{label}</span>
                              <span className="text-xs text-gray-800 dark:text-gray-200 font-mono break-all">{String(displayValue)}</span>
                            </div>
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  );
                })()}

                {/* Target Resource */}
                {(selectedLog.targetId || selectedLog.targetType || selectedLog.targetResource) && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Affected Resource</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Resource Type</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{selectedLog.targetType || selectedLog.targetResource || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Resource ID</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{selectedLog.targetId || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Outcome & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Outcome</p>
                    {(() => {
                      const s = selectedLog.status || 'SUCCESS';
                      const isSuccess = s === 'SUCCESS';
                      const isFailed = s === 'FAILED';
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${isSuccess ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : isFailed ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                          <span className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-green-500' : isFailed ? 'bg-red-500' : 'bg-gray-400'}`} /> {s}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold mb-1">Log Reference</p>
                    <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{selectedLog.logId}</p>
                  </div>
                </div>

                {/* Error Message */}
                {selectedLog.errorMessage && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800/50">
                    <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">Error Details</h4>
                    <p className="text-sm text-red-800 dark:text-red-300">{selectedLog.errorMessage}</p>
                  </div>
                )}

                {/* Old/New Value diffs */}
                {selectedLog.oldValue && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Previous State</h4>
                    <pre className="text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                      {(() => { try { return JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2); } catch { return selectedLog.oldValue; } })()}
                    </pre>
                  </div>
                )}
                {selectedLog.newValue && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Updated State</h4>
                    <pre className="text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-3 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700">
                      {(() => { try { return JSON.stringify(JSON.parse(selectedLog.newValue), null, 2); } catch { return selectedLog.newValue; } })()}
                    </pre>
                  </div>
                )}

                {/* Session / Technical Info */}
                {selectedLog.userAgent && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Session Information</h4>
                    <div className="space-y-2">
                      {selectedLog.ipAddress && selectedLog.ipAddress !== 'Client-IP' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase min-w-[80px]">IP Address</span>
                          <span className="text-xs font-mono text-gray-800 dark:text-gray-200">{selectedLog.ipAddress}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase min-w-[80px] flex-shrink-0">Browser</span>
                        <span className="text-[11px] text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                          {(() => {
                            const ua = selectedLog.userAgent || '';
                            const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)?.[0] || '';
                            const os = ua.match(/(Windows NT [\d.]+|Mac OS X [\d._]+|Linux|Android [\d.]+|iOS [\d._]+)/)?.[0]?.replace(/_/g, '.') || '';
                            if (browser || os) return `${browser}${os ? ` on ${os}` : ''}`;
                            return ua.substring(0, 100) + (ua.length > 100 ? '...' : '');
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Anomaly Assessment */}
                <div className={`rounded-xl p-4 border ${(() => {
                  const a = selectedLog.action;
                  if (a === 'PROJECT_DELETED' || a === 'USER_DELETED') return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/40';
                  if (a === 'ROLE_CHANGED' || a === 'SETTINGS_UPDATED' || a === 'DATA_EXPORT') return 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/40';
                  return 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/40';
                })()}`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${(() => {
                    const a = selectedLog.action;
                    if (a === 'PROJECT_DELETED' || a === 'USER_DELETED') return 'text-red-700 dark:text-red-300';
                    if (a === 'ROLE_CHANGED' || a === 'SETTINGS_UPDATED' || a === 'DATA_EXPORT') return 'text-yellow-700 dark:text-yellow-300';
                    return 'text-green-700 dark:text-green-300';
                  })()}`}>Risk Level</h4>
                  <p className="text-sm font-semibold">
                    {(() => {
                      const a = selectedLog.action;
                      if (a === 'PROJECT_DELETED' || a === 'USER_DELETED') return <span className="text-red-700 dark:text-red-300">🔴 High — Destructive action, may need review</span>;
                      if (a === 'ROLE_CHANGED') return <span className="text-yellow-700 dark:text-yellow-300">🟡 Medium — Privilege change, verify authorization</span>;
                      if (a === 'SETTINGS_UPDATED') return <span className="text-yellow-700 dark:text-yellow-300">🟡 Medium — System-wide settings changed</span>;
                      if (a === 'DATA_EXPORT') return <span className="text-yellow-700 dark:text-yellow-300">🟡 Medium — Data downloaded from system</span>;
                      if (a === 'USER_LOGIN') return <span className="text-green-700 dark:text-green-300">🟢 Low — Normal login activity</span>;
                      return <span className="text-green-700 dark:text-green-300">🟢 Low — Routine operation</span>;
                    })()}
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <button 
                  onClick={() => setSelectedLog(null)} 
                  className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
