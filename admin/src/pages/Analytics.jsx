import { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, FolderOpen, Clock, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const Analytics = () => {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotification();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [projRes, usersRes, logsRes, ticketsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/admin/users'),
        api.get('/audit-logs?limit=1000'),
        api.get('/support-tickets').catch(() => ({ data: { data: [] } })),
      ]);
      setProjects(projRes.data || []);
      setUsers(usersRes.data || []);
      setAuditLogs(logsRes.data?.logs || []);
      setTickets(ticketsRes.data?.data || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      notify.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ──────────────────────────────────────

  const projectStatusData = useMemo(() => {
    const counts = {};
    projects.forEach(p => {
      const s = p.status || 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const roleDistribution = useMemo(() => {
    const counts = {};
    users.forEach(u => {
      const r = u.role || 'Unknown';
      counts[r] = (counts[r] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const ticketStatusData = useMemo(() => {
    const counts = {};
    tickets.forEach(t => {
      const s = t.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [tickets]);

  // Activity over last 30 days
  const activityTimeline = useMemo(() => {
    const days = {};
    const now = new Date();
    // Seed last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = { date: key, actions: 0 };
    }
    auditLogs.forEach(log => {
      const ts = log.timestamp || log.createdAt;
      if (!ts) return;
      const key = new Date(typeof ts === 'number' ? ts : ts).toISOString().split('T')[0];
      if (days[key]) days[key].actions += 1;
    });
    return Object.values(days).map(d => ({
      ...d,
      label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [auditLogs]);

  // Top action types
  const topActions = useMemo(() => {
    const counts = {};
    auditLogs.forEach(log => {
      const a = log.action || 'UNKNOWN';
      counts[a] = (counts[a] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [auditLogs]);

  // Activity heatmap (day of week × hour)
  const heatmapData = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const grid = dayNames.map(day => ({ day, ...Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, 0])) }));
    auditLogs.forEach(log => {
      const ts = log.timestamp || log.createdAt;
      if (!ts) return;
      const d = new Date(typeof ts === 'number' ? ts : ts);
      const dow = d.getDay();
      const hour = d.getHours();
      grid[dow][hour] = (grid[dow][hour] || 0) + 1;
    });
    return grid;
  }, [auditLogs]);

  const maxHeat = useMemo(() => {
    let max = 0;
    heatmapData.forEach(row => {
      for (let h = 0; h < 24; h++) if (row[h] > max) max = row[h];
    });
    return max || 1;
  }, [heatmapData]);

  const heatColor = (val) => {
    if (val === 0) return 'bg-gray-100 dark:bg-gray-700';
    const ratio = val / maxHeat;
    if (ratio < 0.25) return 'bg-blue-200 dark:bg-blue-900/40';
    if (ratio < 0.5) return 'bg-blue-400 dark:bg-blue-700';
    if (ratio < 0.75) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-blue-600 dark:bg-blue-500';
  };

  // Summary numbers
  const summary = useMemo(() => ({
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status !== 'Completed' && p.status !== 'Cancelled').length,
    totalUsers: users.length,
    totalLogs: auditLogs.length,
    openTickets: tickets.filter(t => t.status === 'open' || t.status === 'pending').length,
    resolvedTickets: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  }), [projects, users, auditLogs, tickets]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="text-xs">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Analytics & Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visual overview of platform activity and data</p>
        </div>
        <button
          onClick={fetchAll}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Projects', value: summary.totalProjects, color: 'blue' },
          { label: 'Active Projects', value: summary.activeProjects, color: 'green' },
          { label: 'Total Users', value: summary.totalUsers, color: 'purple' },
          { label: 'Audit Logs', value: summary.totalLogs, color: 'indigo' },
          { label: 'Open Tickets', value: summary.openTickets, color: 'orange' },
          { label: 'Resolved', value: summary.resolvedTickets, color: 'emerald' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 text-${color}-600 dark:text-${color}-400`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Activity Timeline + Project Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Timeline (wider) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Activity (Last 30 Days)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Daily audit log events</p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={activityTimeline}>
              <defs>
                <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-gray-500" interval={4} />
              <YAxis tick={{ fontSize: 10 }} className="text-gray-500" allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="actions" name="Actions" stroke="#3b82f6" fill="url(#colorActions)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Project Status Pie */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-green-500" /> Project Status
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{projects.length} total projects</p>
          {projectStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {projectStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">No projects yet</div>
          )}
        </div>
      </div>

      {/* Row 2: Top Actions Bar Chart + Role Distribution + Ticket Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Action Types */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Top Action Types</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Most common audit log actions</p>
          {topActions.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topActions} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No logs yet</div>
          )}
        </div>

        {/* Role + Ticket Charts stacked */}
        <div className="space-y-6">
          {/* User Roles */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" /> User Roles
            </h2>
            <div className="mt-3 space-y-2">
              {roleDistribution.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{r.name}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Ticket Status</h2>
            <div className="mt-3 space-y-2">
              {ticketStatusData.length > 0 ? ticketStatusData.map((t, i) => (
                <div key={t.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{t.name}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{t.value}</span>
                </div>
              )) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">No tickets yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Activity Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-500" /> Activity Heatmap
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">When users are most active (Day × Hour)</p>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Hour labels */}
            <div className="flex ml-12 mb-1">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-gray-400 dark:text-gray-500">
                  {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
                </div>
              ))}
            </div>
            {/* Rows */}
            {heatmapData.map((row) => (
              <div key={row.day} className="flex items-center gap-1 mb-1">
                <span className="w-10 text-right text-xs text-gray-500 dark:text-gray-400 pr-2">{row.day}</span>
                {Array.from({ length: 24 }, (_, h) => (
                  <div
                    key={h}
                    className={`flex-1 h-5 rounded-sm ${heatColor(row[h])} transition-colors`}
                    title={`${row.day} ${h}:00 — ${row[h]} action${row[h] !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-2">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 mr-1">Less</span>
              {['bg-gray-100 dark:bg-gray-700', 'bg-blue-200 dark:bg-blue-900/40', 'bg-blue-400 dark:bg-blue-700', 'bg-blue-500 dark:bg-blue-600', 'bg-blue-600 dark:bg-blue-500'].map((c, i) => (
                <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
              ))}
              <span className="text-[9px] text-gray-400 dark:text-gray-500 ml-1">More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
