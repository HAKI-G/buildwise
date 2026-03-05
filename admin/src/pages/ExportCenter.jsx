import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Users, FolderOpen, FileText, LifeBuoy, Calendar, CheckCircle, Filter } from 'lucide-react';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const DATASETS = [
  { key: 'users', label: 'Users', icon: Users, color: 'blue', description: 'All registered user accounts' },
  { key: 'projects', label: 'Projects', icon: FolderOpen, color: 'green', description: 'All projects with owner info' },
  { key: 'auditLogs', label: 'Audit Logs', icon: FileText, color: 'purple', description: 'System activity and action logs' },
  { key: 'tickets', label: 'Support Tickets', icon: LifeBuoy, color: 'orange', description: 'All submitted support tickets' },
];

const ExportCenter = () => {
  const [data, setData] = useState({ users: [], projects: [], auditLogs: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedSets, setSelectedSets] = useState(new Set(['users', 'projects', 'auditLogs', 'tickets']));
  const notify = useNotification();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [usersRes, projRes, logsRes, ticketsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/projects'),
        api.get('/audit-logs?limit=5000'),
        api.get('/support-tickets').catch(() => ({ data: { data: [] } })),
      ]);

      // Enrich projects with owner names
      const userMap = {};
      (usersRes.data || []).forEach(u => { userMap[u.userId] = u; });
      const projects = (projRes.data || []).map(p => ({
        ...p,
        ownerName: userMap[p.userId]?.name || userMap[p.createdBy]?.name || '',
        ownerEmail: userMap[p.userId]?.email || userMap[p.createdBy]?.email || '',
      }));

      setData({
        users: usersRes.data || [],
        projects,
        auditLogs: logsRes.data?.logs || [],
        tickets: ticketsRes.data?.data || [],
      });
    } catch (err) {
      console.error('Export data fetch error:', err);
      notify.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterByDate = (items, dateField) => {
    if (!dateRange.start && !dateRange.end) return items;
    return items.filter(item => {
      const ts = item[dateField];
      if (!ts) return true;
      const d = new Date(typeof ts === 'number' ? ts : ts);
      if (dateRange.start && d < new Date(dateRange.start)) return false;
      if (dateRange.end) {
        const endD = new Date(dateRange.end);
        endD.setHours(23, 59, 59, 999);
        if (d > endD) return false;
      }
      return true;
    });
  };

  const toCSV = (headers, rows) => {
    const escape = (val) => {
      const s = val === null || val === undefined ? '' : String(val);
      return `"${s.replace(/"/g, '""')}"`;
    };
    return [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(','))
    ].join('\n');
  };

  const downloadCSV = (filename, csvContent) => {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    return new Date(typeof ts === 'number' ? ts : ts).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const exportSingle = (key) => {
    setExporting(key);
    try {
      let csv = '';
      let filename = '';
      const today = new Date().toISOString().split('T')[0];

      switch (key) {
        case 'users': {
          const items = filterByDate(data.users, 'createdAt');
          csv = toCSV(
            ['User ID', 'Name', 'Email', 'Role', 'Phone', 'Company', 'Job Title', '2FA Enabled', 'Created At', 'Updated At'],
            items.map(u => [u.userId, u.name, u.email, u.role, u.phone || '', u.company || '', u.jobTitle || '', u.twoFactorEnabled ? 'Yes' : 'No', formatDate(u.createdAt), formatDate(u.updatedAt)])
          );
          filename = `buildwise-users-${today}.csv`;
          break;
        }
        case 'projects': {
          const items = filterByDate(data.projects, 'createdAt');
          csv = toCSV(
            ['Project ID', 'Name', 'Status', 'Owner', 'Owner Email', 'Location', 'Budget', 'Progress %', 'Start Date', 'End Date', 'Created At'],
            items.map(p => [p.projectId || p.id, p.name || p.projectName, p.status, p.ownerName, p.ownerEmail, p.location || '', p.budget || '', p.progress || 0, p.startDate || '', p.endDate || '', formatDate(p.createdAt)])
          );
          filename = `buildwise-projects-${today}.csv`;
          break;
        }
        case 'auditLogs': {
          const items = filterByDate(data.auditLogs, 'timestamp');
          csv = toCSV(
            ['Log ID', 'Timestamp', 'User', 'User ID', 'Action', 'Description', 'Status', 'Target Type', 'Target ID'],
            items.map(l => [l.logId, formatDate(l.timestamp), l.userName || '', l.userId, l.action, l.actionDescription || '', l.status || '', l.targetType || l.targetResource || '', l.targetId || ''])
          );
          filename = `buildwise-audit-logs-${today}.csv`;
          break;
        }
        case 'tickets': {
          const items = filterByDate(data.tickets, 'createdAt');
          csv = toCSV(
            ['Ticket #', 'Subject', 'Status', 'Priority', 'Name', 'Email', 'Message', 'Admin Notes', 'Created At', 'Updated At'],
            items.map(t => [t.ticketNumber || t.ticketId, t.subject, t.status, t.priority, t.name || '', t.email || '', t.message || '', t.adminNotes || '', formatDate(t.createdAt), formatDate(t.updatedAt)])
          );
          filename = `buildwise-tickets-${today}.csv`;
          break;
        }
      }

      downloadCSV(filename, csv);
      notify.success(`Exported ${key} successfully`);
    } catch (err) {
      console.error('Export error:', err);
      notify.error(`Failed to export ${key}`);
    } finally {
      setExporting(null);
    }
  };

  const exportAll = () => {
    const targets = Array.from(selectedSets);
    if (targets.length === 0) {
      notify.warning('Select at least one dataset to export');
      return;
    }
    targets.forEach(key => exportSingle(key));
  };

  const toggleSet = (key) => {
    setSelectedSets(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const getCount = (key) => {
    const dateFieldMap = { users: 'createdAt', projects: 'createdAt', auditLogs: 'timestamp', tickets: 'createdAt' };
    return filterByDate(data[key], dateFieldMap[key]).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-emerald-500" />
          Data Export Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Export platform data as professionally formatted CSV files
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Filter className="w-4 h-4 text-gray-400" />
            Date Range Filter (optional)
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button
              onClick={() => setDateRange({ start: '', end: '' })}
              className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATASETS.map(({ key, label, icon: Icon, color, description }) => {
          const count = getCount(key);
          const isSelected = selectedSets.has(key);
          return (
            <div
              key={key}
              className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-5 transition-all cursor-pointer ${
                isSelected
                  ? `border-${color}-400 dark:border-${color}-600 shadow-md`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => toggleSet(key)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{label}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSelected && <CheckCircle className={`w-5 h-5 text-${color}-500`} />}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
                    {loading ? '...' : count}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">records</span>
                  {(dateRange.start || dateRange.end) && count !== data[key].length && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      (of {data[key].length} total)
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); exportSingle(key); }}
                  disabled={loading || count === 0 || exporting === key}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-${color}-600 hover:bg-${color}-700 text-white`}
                >
                  {exporting === key ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Export CSV
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Export */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Bulk Export</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Download {selectedSets.size} selected dataset{selectedSets.size !== 1 ? 's' : ''} as separate CSV files
            </p>
          </div>
          <button
            onClick={exportAll}
            disabled={loading || selectedSets.size === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export All Selected ({selectedSets.size})
          </button>
        </div>
      </div>

      {/* Format Info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-sm text-gray-600 dark:text-gray-400">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Export Notes</h4>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Files are exported in CSV format with UTF-8 encoding (BOM included for Excel compatibility)</li>
          <li>All dates are formatted in a human-readable format</li>
          <li>The date range filter applies across all datasets when set</li>
          <li>Click a dataset card to toggle it for bulk export, or use individual export buttons</li>
          <li>Project exports include owner name and email resolved from user data</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportCenter;
