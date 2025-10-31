import React, { useState, useEffect } from 'react';
import auditService from '../services/auditService';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, [showArchived]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await auditService.getAllLogs({ limit: 100 });
      
      // ✅ Filter by string 'true' or 'false'
      let filteredByArchive = (response.logs || []).filter(log => 
        showArchived ? log.isArchived === 'true' : log.isArchived !== 'true'
      );
      
      const sortedLogs = filteredByArchive.sort((a, b) => 
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
      const response = await auditService.getAllLogs({ limit: 100, lastKey: lastEvaluatedKey });
      const newLogs = [...logs, ...(response.logs || [])];
      
      let filteredByArchive = newLogs.filter(log => 
        showArchived ? log.isArchived === 'true' : log.isArchived !== 'true'
      );
      
      const sortedLogs = filteredByArchive.sort((a, b) => 
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
        const allResponse = await auditService.getAllLogs({ limit: 500 });
        const allLogs = allResponse.logs || [];
        filteredLogs = allLogs.filter(log => 
          log.userName?.toLowerCase().includes(filterValue.toLowerCase()) ||
          log.userEmail?.toLowerCase().includes(filterValue.toLowerCase()) ||
          log.userId?.toLowerCase().includes(filterValue.toLowerCase())
        );
      } else if (filterType === 'action' && filterValue) {
        const allResponse = await auditService.getAllLogs({ limit: 500 });
        const allLogs = allResponse.logs || [];
        filteredLogs = allLogs.filter(log => log.action === filterValue);
      } else if (filterType === 'dateRange' && dateRange.start && dateRange.end) {
        const allResponse = await auditService.getAllLogs({ limit: 500 });
        const allLogs = allResponse.logs || [];
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        filteredLogs = allLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= startDate && logDate <= endDate;
        });
      } else {
        const response = await auditService.getAllLogs({ limit: 100 });
        filteredLogs = response.logs || [];
      }
      
      filteredLogs = filteredLogs.filter(log => 
        showArchived ? log.isArchived === 'true' : log.isArchived !== 'true'
      );
      
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

  // ✅ Archive single log
  const handleArchiveLog = async (log) => {
    if (!window.confirm('Archive this log? It will be moved to archived logs.')) {
      return;
    }

    try {
      setArchiving(true);
      await auditService.archiveLog(log.logId, log.timestamp);
      await fetchAuditLogs();
    } catch (err) {
      setError('Failed to archive log');
      console.error(err);
    } finally {
      setArchiving(false);
    }
  };

  // ✅ Unarchive single log
  const handleUnarchiveLog = async (log) => {
    if (!window.confirm('Restore this log from archive?')) {
      return;
    }

    try {
      setArchiving(true);
      await auditService.unarchiveLog(log.logId, log.timestamp);
      await fetchAuditLogs();
    } catch (err) {
      setError('Failed to unarchive log');
      console.error(err);
    } finally {
      setArchiving(false);
    }
  };

  // ✅ NEW: Restore all archived logs
  const handleRestoreAll = async () => {
    if (logs.length === 0) {
      alert('No archived logs to restore');
      return;
    }

    if (!window.confirm(`Restore all ${logs.length} archived log(s)?`)) {
      return;
    }

    try {
      setArchiving(true);
      
      // Build array of {logId, timestamp} for all archived logs
      const logsToRestore = logs.map(log => ({
        logId: log.logId,
        timestamp: log.timestamp
      }));
      
      // Restore each log
      await Promise.all(
        logsToRestore.map(log => 
          auditService.unarchiveLog(log.logId, log.timestamp)
        )
      );
      
      await fetchAuditLogs();
    } catch (err) {
      setError('Failed to restore all logs');
      console.error(err);
    } finally {
      setArchiving(false);
    }
  };

  const getActionBadgeColor = (action) => {
    const colors = {
      PROJECT_CREATED: 'bg-green-100 text-green-800',
      PROJECT_UPDATED: 'bg-yellow-100 text-yellow-800',
      PROJECT_DELETED: 'bg-red-100 text-red-800',
      USER_CREATED: 'bg-indigo-100 text-indigo-800',
      USER_UPDATED: 'bg-yellow-100 text-yellow-800',
      USER_DELETED: 'bg-red-100 text-red-800',
      ROLE_CHANGED: 'bg-purple-100 text-purple-800',
      SETTINGS_UPDATED: 'bg-cyan-100 text-cyan-800',
      DATA_EXPORT: 'bg-teal-100 text-teal-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
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
      ['Timestamp', 'User', 'Email', 'Action', 'Description', 'Status', 'Target', 'Archived'],
      ...logs.map(log => [
        formatDate(log.timestamp),
        log.userName || '',
        log.userEmail || '',
        log.action || '',
        (log.actionDescription || '').replace(/"/g, '""'),
        log.status || '',
        log.targetResource || '',
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

  const ACTION_TYPES = {
    PROJECT_CREATED: 'PROJECT_CREATED',
    PROJECT_UPDATED: 'PROJECT_UPDATED',
    PROJECT_DELETED: 'PROJECT_DELETED',
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Project Audit Logs</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Project Audit Logs {showArchived && <span className="text-gray-500">(Archived)</span>}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setShowArchived(false)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  !showArchived 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Active Logs
              </button>
              <button
                onClick={() => setShowArchived(true)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  showArchived 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Archived Logs
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            {/* ✅ NEW: Restore All button (only in archived view) */}
            {showArchived && logs.length > 0 && (
              <button 
                onClick={handleRestoreAll} 
                disabled={archiving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restore All ({logs.length})
              </button>
            )}
            <button onClick={fetchAuditLogs} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button onClick={exportLogs} disabled={logs.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter By</label>
              <select 
                value={filterType} 
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setFilterValue('');
                  setDateRange({ start: '', end: '' });
                }} 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Logs</option>
                <option value="user">User Name/Email</option>
                <option value="action">Action Type</option>
                <option value="dateRange">Date Range</option>
              </select>
            </div>
            
            {filterType === 'user' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">User Name or Email</label>
                <input 
                  type="text" 
                  value={filterValue} 
                  onChange={(e) => setFilterValue(e.target.value)} 
                  placeholder="Enter name or email" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                />
              </div>
            )}
            
            {filterType === 'action' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select 
                  value={filterValue} 
                  onChange={(e) => setFilterValue(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input 
                    type="datetime-local" 
                    value={dateRange.start} 
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input 
                    type="datetime-local" 
                    value={dateRange.end} 
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{logs.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Projects Created</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {logs.filter(l => l.action === 'PROJECT_CREATED').length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Projects Updated</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {logs.filter(l => l.action === 'PROJECT_UPDATED').length}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Projects Deleted</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {logs.filter(l => l.action === 'PROJECT_DELETED').length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* ✅ REMOVED: Checkbox column */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.logId} className="hover:bg-gray-50 transition-colors">
                    {/* ✅ REMOVED: Checkbox cell */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{log.userName}</span>
                        <span className="text-xs text-gray-500">{log.userEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                      {log.actionDescription}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                      <button 
                        onClick={() => setSelectedLog(log)} 
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View
                      </button>
                      {/* ✅ Individual archive/restore buttons */}
                      {!showArchived ? (
                        <button 
                          onClick={() => handleArchiveLog(log)}
                          disabled={archiving}
                          className="text-orange-600 hover:text-orange-900 font-medium disabled:opacity-50"
                        >
                          Archive
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUnarchiveLog(log)}
                          disabled={archiving}
                          className="text-green-600 hover:text-green-900 font-medium disabled:opacity-50"
                        >
                          Restore
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {showArchived ? 'No archived logs found' : 'No audit logs found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterType !== 'all' 
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

        {/* Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  Audit Log Details
                  {selectedLog.isArchived === 'true' && (
                    <span className="ml-2 text-sm font-normal text-orange-600">(Archived)</span>
                  )}
                </h2>
                <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Log ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.logId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedLog.timestamp)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">User Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.userName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">User Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.userEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">User ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Action</label>
                    <p className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.actionDescription}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedLog.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {selectedLog.status}
                      </span>
                    </p>
                  </div>
                  {selectedLog.targetResource && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Target Resource</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLog.targetResource}</p>
                    </div>
                  )}
                  {selectedLog.targetId && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500">Target ID (Project ID)</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">{selectedLog.targetId}</p>
                    </div>
                  )}
                  {selectedLog.oldValue && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500">Old Value (Before Update)</label>
                      <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValue && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-500">New Value (After Update)</label>
                      <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.errorMessage && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-red-500">Error Message</label>
                      <p className="mt-1 text-sm text-red-900 bg-red-50 p-3 rounded-lg">{selectedLog.errorMessage}</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">User Agent (Browser)</label>
                    <p className="mt-1 text-xs text-gray-900 break-all bg-gray-50 p-2 rounded">{selectedLog.userAgent}</p>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
                <button 
                  onClick={() => setSelectedLog(null)} 
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
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
