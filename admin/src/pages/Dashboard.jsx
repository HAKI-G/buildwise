import { Users, FolderOpen, AlertCircle, CheckCircle, Clock, LifeBuoy, ArrowRight, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const StatCard = ({ title, value, icon: Icon, color, gradient, loading }) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-all transform hover:-translate-y-1`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/80 text-sm font-medium uppercase tracking-wide">{title}</p>
        {loading ? (
          <div className="h-10 w-20 bg-white/20 animate-pulse rounded mt-3"></div>
        ) : (
          <p className="text-4xl font-bold mt-2">{value}</p>
        )}
      </div>
      <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
        <Icon className="w-8 h-8" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingTickets: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [serverHealth, setServerHealth] = useState({ server: null, db: null });

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const [usersRes, projectsRes, auditRes, ticketsRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/projects'),
        api.get(`/audit-logs?limit=4`),
        api.get('/support-tickets').catch(() => ({ data: { data: [] } }))
      ]);

      const totalUsers = usersRes.data?.length || 0;
      const allProjects = projectsRes.data || [];
      const activeProjects = allProjects.filter(p => 
        p.status !== 'Completed' && p.status !== 'Cancelled'
      ).length;
      const completedProjects = allProjects.filter(p => 
        p.status === 'Completed'
      ).length;
      const pendingTickets = (ticketsRes.data?.data || []).filter(t => t.status === 'pending' || t.status === 'open').length;

      setStats({
        totalUsers,
        activeProjects,
        completedProjects,
        pendingTickets
      });

      const activities = (auditRes.data?.logs || [])
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
        .slice(0, 4)
        .map(log => ({
          id: log.logId,
          action: log.actionDescription || formatAction(log.action),
          user: log.userName || 'Unknown User',
          time: formatTimeAgo(log.timestamp || log.createdAt),
          timestamp: log.timestamp || log.createdAt
        }));

      setRecentActivities(activities);
      setLastUpdated(new Date());
      setError(null);

      // Check server health
      try {
        const healthRes = await api.get('/health');
        setServerHealth({ server: 'ok', db: healthRes.data?.dynamodb || 'ok' });
      } catch {
        setServerHealth({ server: 'down', db: 'unknown' });
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatAction = (action) => {
    const actionMap = {
      'PROJECT_CREATED': 'New project created',
      'PROJECT_UPDATED': 'Project updated',
      'PROJECT_DELETED': 'Project deleted',
      'USER_CREATED': 'New user registered',
      'USER_UPDATED': 'User profile updated',
      'USER_DELETED': 'User removed',
      'USER_ROLE_CHANGED': 'User role changed'
    };
    return actionMap[action] || action;
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4" />
            <span>Updated {formatTimeAgo(lastUpdated)}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          gradient="from-blue-500 to-blue-600"
          loading={loading}
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          icon={FolderOpen}
          gradient="from-green-500 to-green-600"
          loading={loading}
        />
        <StatCard
          title="Pending Tickets"
          value={stats.pendingTickets}
          icon={LifeBuoy}
          gradient="from-yellow-500 to-orange-500"
          loading={loading}
        />
        <StatCard
          title="Completed"
          value={stats.completedProjects}
          icon={CheckCircle}
          gradient="from-purple-500 to-purple-600"
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Manage Users', icon: Users, path: '/users', color: 'blue' },
            { label: 'View Projects', icon: FolderOpen, path: '/projects', color: 'green' },
            { label: 'Support Tickets', icon: LifeBuoy, path: '/support-tickets', color: 'orange' },
            { label: 'Audit Logs', icon: FileText, path: '/audit-logs', color: 'purple' },
          ].map(({ label, icon: Icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-${color}-300 dark:hover:border-${color}-600 hover:bg-${color}-50 dark:hover:bg-${color}-900/20 transition-all text-left`}
            >
              <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">{label}</span>
              <ArrowRight className="w-4 h-4 ml-auto text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Latest system events</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className={`flex items-start gap-3 pb-4 ${index !== recentActivities.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600 dark:text-gray-400">by {activity.user}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-600">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">No recent activity</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Activity will appear here as users interact with the system</p>
              </div>
            )}
          </div>
        </div>


        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Status</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current system health</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Server Status */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Server Status</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  serverHealth.server === 'ok'
                    ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                    : serverHealth.server === 'down'
                    ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                    : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    serverHealth.server === 'ok' ? 'bg-green-600 dark:bg-green-400 animate-pulse'
                    : serverHealth.server === 'down' ? 'bg-red-500'
                    : 'bg-gray-400'
                  }`}></span>
                  {serverHealth.server === 'ok' ? 'Operational' : serverHealth.server === 'down' ? 'Down' : 'Checking...'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full transition-all duration-500 ${
                  serverHealth.server === 'ok' ? 'bg-gradient-to-r from-green-500 to-green-600 w-full'
                  : serverHealth.server === 'down' ? 'bg-red-500 w-1/4'
                  : 'bg-gray-400 w-1/2 animate-pulse'
                }`}></div>
              </div>
            </div>

            {/* Database */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database</span>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  serverHealth.db === 'ok' || serverHealth.db === 'connected'
                    ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                    : serverHealth.db === 'unknown'
                    ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                    : 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    serverHealth.db === 'ok' || serverHealth.db === 'connected' ? 'bg-green-600 dark:bg-green-400 animate-pulse'
                    : 'bg-gray-400'
                  }`}></span>
                  {serverHealth.db === 'ok' || serverHealth.db === 'connected' ? 'Connected' : 'Checking...'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className={`h-2 rounded-full transition-all duration-500 ${
                  serverHealth.db === 'ok' || serverHealth.db === 'connected' ? 'bg-gradient-to-r from-green-500 to-green-600 w-full'
                  : 'bg-gray-400 w-1/2 animate-pulse'
                }`}></div>
              </div>
            </div>

            {/* Total Users */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Users</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {loading ? '...' : stats.totalUsers}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(stats.totalUsers * 2, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Active Projects */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Projects</span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {loading ? '...' : stats.activeProjects}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(stats.activeProjects * 8, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;