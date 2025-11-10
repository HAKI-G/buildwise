import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-southeast-1" });
const docClient = DynamoDBDocumentClient.from(client);

const USERS_TABLE = 'BuildWiseUsers';
const PROJECTS_TABLE = 'buildwiseProjects';

/**
 * @desc     Get admin dashboard statistics
 * @route    GET /api/admin/dashboard/stats
 * @access   Private/Admin
 */
export const getAdminDashboardStats = async (req, res) => {
  try {
    // Fetch all users
    const usersData = await docClient.send(new ScanCommand({ 
      TableName: USERS_TABLE 
    }));
    
    // Fetch all projects
    const projectsData = await docClient.send(new ScanCommand({ 
      TableName: PROJECTS_TABLE 
    }));

    const users = usersData.Items || [];
    const projects = projectsData.Items || [];

    // Calculate statistics
    const totalUsers = users.length;
    
    // Count projects by status
    const activeProjects = projects.filter(p => 
      p.status === 'In Progress' || p.status === 'Planning'
    ).length;
    
    const completedProjects = projects.filter(p => 
      p.status === 'Completed'
    ).length;
    
    const pendingIssues = projects.filter(p => 
      p.status === 'On Hold'
    ).length;

    // Calculate trends (compare with 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = users.filter(u => 
      new Date(u.createdAt) > thirtyDaysAgo
    ).length;
    
    const recentProjects = projects.filter(p => 
      new Date(p.createdAt) > thirtyDaysAgo
    ).length;

    // Calculate percentage trends
    const userTrend = totalUsers > 0 
      ? Math.round((recentUsers / totalUsers) * 100) 
      : 0;
    
    const projectTrend = projects.length > 0 
      ? Math.round((recentProjects / projects.length) * 100) 
      : 0;
    
    const completedTrend = completedProjects > 0 
      ? Math.round((completedProjects / projects.length) * 100) 
      : 0;

    res.status(200).json({
      totalUsers,
      activeProjects,
      completedProjects,
      pendingIssues,
      trends: {
        users: userTrend,
        projects: projectTrend,
        completed: completedTrend
      }
    });

  } catch (error) {
    console.error("❌ Error fetching admin dashboard stats:", error);
    res.status(500).json({ 
      message: "Failed to fetch dashboard statistics", 
      error: error.message 
    });
  }
};

/**
 * @desc     Get recent activity feed for admin dashboard
 * @route    GET /api/admin/dashboard/recent-activity
 * @access   Private/Admin
 */
export const getAdminRecentActivity = async (req, res) => {
  try {
    // Fetch recent users (last 10)
    const usersData = await docClient.send(new ScanCommand({ 
      TableName: USERS_TABLE 
    }));
    
    // Fetch recent projects (last 10)
    const projectsData = await docClient.send(new ScanCommand({ 
      TableName: PROJECTS_TABLE 
    }));

    const users = usersData.Items || [];
    const projects = projectsData.Items || [];

    // Create activity feed
    const activities = [];

    // Add user registrations
    users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .forEach(user => {
        activities.push({
          id: `user-${user.userId}`,
          action: 'New user registered',
          user: user.name,
          time: getTimeAgo(user.createdAt),
          timestamp: new Date(user.createdAt)
        });
      });

    // Add project updates
    projects
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .forEach(project => {
        activities.push({
          id: `project-${project.projectId}`,
          action: project.status === 'Completed' ? 'Project completed' : 'Project updated',
          user: project.projectManager || 'System',
          time: getTimeAgo(project.createdAt),
          timestamp: new Date(project.createdAt)
        });
      });

    // Sort all activities by timestamp and take top 10
    const sortedActivities = activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(({ timestamp, ...activity }) => activity); // Remove timestamp from response

    res.status(200).json(sortedActivities);

  } catch (error) {
    console.error("❌ Error fetching admin recent activity:", error);
    res.status(500).json({ 
      message: "Failed to fetch recent activity", 
      error: error.message 
    });
  }
};

/**
 * @desc     Get system status metrics for admin dashboard
 * @route    GET /api/admin/dashboard/system-status
 * @access   Private/Admin
 */
export const getAdminSystemStatus = async (req, res) => {
  try {
    // Calculate database status
    const usersData = await docClient.send(new ScanCommand({ 
      TableName: USERS_TABLE 
    }));
    
    const projectsData = await docClient.send(new ScanCommand({ 
      TableName: PROJECTS_TABLE 
    }));

    // Mock storage calculation (you can replace with actual S3 metrics)
    const totalRecords = (usersData.Items?.length || 0) + (projectsData.Items?.length || 0);
    const estimatedStorageUsed = Math.min(Math.round(totalRecords * 2.5), 100); // Mock calculation

    // Mock API response time (you can add actual monitoring later)
    const apiResponseTime = Math.floor(Math.random() * 50) + 30; // 30-80ms

    res.status(200).json({
      server: {
        status: 'operational',
        uptime: process.uptime() // Server uptime in seconds
      },
      database: {
        status: 'connected',
        tables: {
          users: usersData.Items?.length || 0,
          projects: projectsData.Items?.length || 0
        }
      },
      storage: {
        used: estimatedStorageUsed,
        unit: 'percent'
      },
      api: {
        responseTime: apiResponseTime,
        unit: 'ms'
      }
    });

  } catch (error) {
    console.error("❌ Error fetching admin system status:", error);
    res.status(500).json({ 
      message: "Failed to fetch system status", 
      error: error.message 
    });
  }
};

/**
 * Helper function to calculate time ago
 */
function getTimeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}