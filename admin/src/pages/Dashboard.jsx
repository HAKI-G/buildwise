import { Users, FolderOpen, AlertCircle, CheckCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-600 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {trend && (
          <p className="text-sm text-green-600 mt-1">↑ {trend}% from last month</p>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const recentActivities = [
    { id: 1, action: 'New user registered', user: 'John Doe', time: '2 hours ago' },
    { id: 2, action: 'Project updated', user: 'Jane Smith', time: '4 hours ago' },
    { id: 3, action: 'Milestone completed', user: 'Mike Johnson', time: '6 hours ago' },
    { id: 4, action: 'New photo uploaded', user: 'Sarah Williams', time: '8 hours ago' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value="24"
          icon={Users}
          color="bg-blue-500"
          trend="12"
        />
        <StatCard
          title="Active Projects"
          value="12"
          icon={FolderOpen}
          color="bg-green-500"
          trend="8"
        />
        <StatCard
          title="Pending Issues"
          value="5"
          icon={AlertCircle}
          color="bg-yellow-500"
        />
        <StatCard
          title="Completed Projects"
          value="8"
          icon={CheckCircle}
          color="bg-purple-500"
          trend="15"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <div className="w-1 h-6 bg-blue-600 mr-3 rounded"></div>
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-600">by {activity.user}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <div className="w-1 h-6 bg-green-600 mr-3 rounded"></div>
            System Status
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Server Status</span>
                <span className="text-sm text-green-600 font-semibold">● Operational</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Database</span>
                <span className="text-sm text-green-600 font-semibold">● Connected</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                <span className="text-sm text-blue-600 font-semibold">75% Used</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">API Response Time</span>
                <span className="text-sm text-green-600 font-semibold">45ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;