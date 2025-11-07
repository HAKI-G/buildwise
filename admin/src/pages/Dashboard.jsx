import { Users, FolderOpen, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
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
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingIssues: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

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

      const [usersRes, projectsRes, auditRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/projects'),
        api.get(`/audit-logs?limit=4&t=${Date.now()}`) // ✅ CHANGED: Added cache busting & limit=4
      ]);

      const totalUsers = usersRes.data?.length || 0;
      const allProjects = projectsRes.data || [];
      const activeProjects = allProjects.filter(p => 
        p.status !== 'Completed' && p.status !== 'Cancelled'
      ).length;
      const completedProjects = allProjects.filter(p => 
        p.status === 'Completed'
      ).length;

      setStats({
        totalUsers,
        activeProjects,
        completedProjects,
        pendingIssues: 0
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
            <Clock className="w-4 h-4" />
            <span>Updated {formatTimeAgo(lastUpdated)}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
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
          title="Pending Issues"
          value={stats.pendingIssues}
          icon={AlertCircle}
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <p className="text-sm text-gray-600 mt-1">Latest system events</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 animate-pulse">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div 
                    key={activity.id} 
                    className={`flex items-start gap-3 pb-4 ${index !== recentActivities.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">by {activity.user}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No recent activity</p>
                <p className="text-sm text-gray-500 mt-1">Activity will appear here as users interact with the system</p>
              </div>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">System Status</h2>
            <p className="text-sm text-gray-600 mt-1">Current system health</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Server Status */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Server Status</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                  Operational
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Database */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Database</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse"></span>
                  Connected
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Total Users */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Total Users</span>
                <span className="text-sm font-bold text-blue-600">
                  {loading ? '...' : stats.totalUsers}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(stats.totalUsers * 2, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Active Projects */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Active Projects</span>
                <span className="text-sm font-bold text-green-600">
                  {loading ? '...' : stats.activeProjects}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
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