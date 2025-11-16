import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search, RefreshCw } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

// ✅ NEW: Format large numbers intelligently
const formatBudget = (value) => {
  if (!value || value === 0) return '₱0';
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(numValue) || numValue === 0) return '₱0';
  
  const isNegative = numValue < 0;
  const num = Math.abs(numValue);
  const sign = isNegative ? '-' : '';
  
  // Format with appropriate scale
  if (num >= 1000000000) {
    return `${sign}₱${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${sign}₱${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${sign}₱${(num / 1000).toFixed(1)}K`;
  } else {
    return `${sign}₱${num.toFixed(2)}`;
  }
};

const ProjectRow = ({ project, taskProgress, budgetProgress, totalSpent }) => {
  const contractCost = typeof project.contractCost === 'string' 
    ? parseFloat(project.contractCost.replace(/[^0-9.-]/g, '')) 
    : (project.contractCost || 0);
  const spent = typeof totalSpent === 'string'
    ? parseFloat(totalSpent.replace(/[^0-9.-]/g, ''))
    : (totalSpent || 0);
  
  const isOverBudget = spent > contractCost;
  const overageAmount = isOverBudget ? spent - contractCost : 0;

  return (
  <div className="block hover:bg-gray-50 dark:hover:bg-slate-700 transition duration-300">
    <div className={`flex items-center p-4 rounded-xl border shadow-sm mb-4 transition-all ${
      isOverBudget
        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
    }`}>
      {project.projectImage ? (
        <img
          src={project.projectImage}
          alt={project.name}
          className="w-12 h-12 rounded-lg mr-4 object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg mr-4 bg-gray-200 dark:bg-slate-600 flex-shrink-0"></div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-800 dark:text-white truncate">{project.name}</p>
          {isOverBudget && (
            <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-md whitespace-nowrap">
              ⚠️ OVER BUDGET
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{project.location}</p>
        {isOverBudget && (
          <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
            Overage: ₱{overageAmount.toLocaleString('en-US', {maximumFractionDigits: 0})}
          </p>
        )}
      </div>

      <div className="w-1/4 mx-4 hidden md:block">
        <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400 mb-1">
          <span>Task</span>
          <span>{taskProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${taskProgress}%` }}
          ></div>
        </div>
      </div>

      <div className="w-1/4 mx-4 hidden md:block">
        <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400 mb-1">
          <span>Budget</span>
          <span>{budgetProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isOverBudget
                ? 'bg-red-600'
                : budgetProgress > 90
                ? 'bg-red-500'
                : budgetProgress > 70
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(budgetProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      <div className="w-48 text-center bg-stone-100 dark:bg-slate-700 p-2 rounded-lg mx-4 hidden lg:block">
        <span className="text-gray-800 dark:text-white">
          Due to {new Date(project.contractCompletionDate || project.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="whitespace-nowrap hidden sm:block">
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
            project.status === 'Completed'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : project.status === 'In Progress'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
          }`}
        >
          {project.status || 'Not Started'}
        </span>
      </div>
    </div>
  </div>
);};

function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [projectsWithProgress, setProjectsWithProgress] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'date'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [showOverBudgetOnly, setShowOverBudgetOnly] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchProjectsWithProgress = async (showLoadingState = true) => {
    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    if (showLoadingState) setLoading(true);
    else setIsRefreshing(true);

    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const projectsResponse = await axios.get('http://localhost:5001/api/projects', config);
      const projectsData = projectsResponse.data;
      setProjects(projectsData);

      const projectsWithProgressData = await Promise.all(
        projectsData.map(async (project) => {
          try {
            const milestonesResponse = await axios.get(
              `http://localhost:5001/api/milestones/project/${project.projectId}`,
              config
            );
            const milestones = milestonesResponse.data || [];

            const tasks = milestones.filter((m) => m.isPhase !== true);
            const completedTasks = tasks.filter((t) => t.status === 'completed').length;
            const taskProgress =
              tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

            const expensesResponse = await axios.get(
              `http://localhost:5001/api/expenses/project/${project.projectId}`,
              config
            );
            const expenses = expensesResponse.data || [];

            const totalSpent = expenses.reduce(
              (sum, expense) => sum + (parseFloat(expense.amount) || 0),
              0
            );
            const budgetProgress =
              project.contractCost > 0
                ? Math.min(Math.round((totalSpent / project.contractCost) * 100), 100)
                : 0;

            return { ...project, taskProgress, budgetProgress, totalSpent };
          } catch (err) {
            console.warn(`Could not fetch progress for project ${project.projectId}:`, err);
            return { ...project, taskProgress: 0, budgetProgress: 0, totalSpent: 0 };
          }
        })
      );

      setProjectsWithProgress(projectsWithProgressData);
      setFilteredProjects(projectsWithProgressData);
      setError('');
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects. Your session may have expired.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjectsWithProgress();
  }, []);

  useEffect(() => {
    if (!loading && location.pathname === '/dashboard') {
      fetchProjectsWithProgress(false);
    }
  }, [location.pathname]);

  const handleManualRefresh = () => {
    fetchProjectsWithProgress(false);
  };

  useEffect(() => {
    let results = projectsWithProgress;

    // Search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      results = results.filter(
        (project) =>
          project.name?.toLowerCase().includes(searchLower) ||
          project.location?.toLowerCase().includes(searchLower) ||
          project.status?.toLowerCase().includes(searchLower)
      );
    }

    // Over budget filter
    if (showOverBudgetOnly) {
      results = results.filter((p) => {
        const contractCost = typeof p.contractCost === 'string' 
          ? parseFloat(p.contractCost.replace(/[^0-9.-]/g, '')) 
          : (p.contractCost || 0);
        const spent = typeof p.totalSpent === 'string'
          ? parseFloat(p.totalSpent.replace(/[^0-9.-]/g, ''))
          : (p.totalSpent || 0);
        return spent > contractCost;
      });
    }

    // Sorting
    results.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'name') {
        compareValue = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        compareValue = dateA - dateB;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredProjects(results);
  }, [searchQuery, projectsWithProgress, sortBy, sortOrder, showOverBudgetOnly]);

  const stats = {
    totalProjects: projects.length,
    totalBudget: projects.reduce((sum, p) => {
      const cost = typeof p.contractCost === 'string' 
        ? parseFloat(p.contractCost.replace(/[^0-9.-]/g, '')) 
        : (p.contractCost || 0);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0),
    totalSpent: projectsWithProgress.reduce((sum, p) => {
      const spent = typeof p.totalSpent === 'string'
        ? parseFloat(p.totalSpent.replace(/[^0-9.-]/g, ''))
        : (p.totalSpent || 0);
      return sum + (isNaN(spent) ? 0 : spent);
    }, 0),
    avgCompletion:
      projectsWithProgress.length > 0
        ? Math.round(
            projectsWithProgress.reduce((sum, p) => sum + p.taskProgress, 0) /
              projectsWithProgress.length
          )
        : 0,
    activeProjects: projects.filter((p) => p.status === 'In Progress').length,
  };

  return (
    <Layout
      title="Dashboard"
      headerContent={
        <div className="relative flex-1 max-w-xl ml-8 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Total Projects Card */}
        <div className="bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-700/40 dark:to-slate-800/40 p-4 rounded-xl border border-gray-300 dark:border-slate-600/50 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">📊 Total Projects</p>
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalProjects}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Across all categories</p>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700/50 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-3">🚀 Active Projects</p>
          <div>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
              {stats.activeProjects}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Currently in progress</p>
          </div>
        </div>

        {/* Total Budget Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 p-4 rounded-xl border border-green-200 dark:border-green-700/50 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-3">💰 Total Budget</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-green-600 dark:text-green-300 font-semibold mb-1">Allocated</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300 truncate">
                {formatBudget(stats.totalBudget)}
              </p>
            </div>
            <div className="pt-2 border-t border-green-200 dark:border-green-700/50">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Spent</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400 truncate">
                {formatBudget(stats.totalSpent)}
              </p>
            </div>
          </div>
        </div>

        {/* Avg. Completion Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-700/50 shadow-md transition-all hover:shadow-lg">
          <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-3">⚡ Avg. Completion</p>
          <div>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
              {stats.avgCompletion}%
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Overall progress</p>
          </div>
        </div>
      </div>

      {isRefreshing && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Updating project data...
        </div>
      )}

      {/* Sorting & Filtering Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-slate-900/30 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white text-sm"
        >
          <option value="name">Project Name</option>
          <option value="date">Date Created</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white text-sm"
        >
          <option value="asc">Ascending (A→Z / Oldest)</option>
          <option value="desc">Descending (Z→A / Newest)</option>
        </select>

        <button
          onClick={() => setShowOverBudgetOnly(!showOverBudgetOnly)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            showOverBudgetOnly
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600'
          }`}
        >
          🚨 Over Budget Only
        </button>

        <div className="ml-auto text-sm text-gray-600 dark:text-slate-400">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      <div>
        {/* Active Projects Section */}
        <div>
          <p className="text-gray-500 dark:text-slate-400 font-semibold mb-4">
            {searchQuery
              ? `SEARCH RESULTS (${filteredProjects.filter(p => p.status !== 'Completed').length})`
              : `ACTIVE PROJECTS (${projects.filter(p => p.status !== 'Completed').length})`}
          </p>

          {loading && (
            <p className="text-center py-8 text-gray-500 dark:text-slate-400">
              Loading projects...
            </p>
          )}
          {error && (
            <p className="text-center py-8 text-red-500 dark:text-red-400">{error}</p>
          )}

          {!loading && !error && (
            <div>
              {filteredProjects.filter(p => p.status !== 'Completed').length > 0 ? (
                filteredProjects.filter(p => p.status !== 'Completed').map((project) => (
                  <ProjectRow
                    key={project.projectId}
                    project={project}
                    taskProgress={project.taskProgress}
                    budgetProgress={project.budgetProgress}
                  />
                ))
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
                  <p className="text-gray-500 dark:text-slate-400 mb-4">
                    {searchQuery
                      ? 'No active projects match your search.'
                      : 'No active projects found. Create one on the Projects page!'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => navigate('/projects')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Project
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Completed Projects Section */}
        {!searchQuery && !loading && !error && projectsWithProgress.filter(p => p.status === 'Completed').length > 0 && (
          <div className="mt-8">
            <p className="text-gray-500 dark:text-slate-400 font-semibold mb-4">
              COMPLETED PROJECTS ({projectsWithProgress.filter(p => p.status === 'Completed').length})
            </p>
            <div>
              {projectsWithProgress.filter(p => p.status === 'Completed').map((project) => (
                <div key={project.projectId} className="block hover:bg-gray-50 dark:hover:bg-slate-700 transition duration-300">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-4">
                    <div className="flex items-center flex-1 min-w-0">
                      {project.projectImage ? (
                        <img
                          src={project.projectImage}
                          alt={project.name}
                          className="w-12 h-12 rounded-lg mr-4 object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg mr-4 bg-gray-200 dark:bg-slate-600 flex-shrink-0"></div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 dark:text-white truncate">{project.name}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{project.location}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                      <div className="hidden sm:block text-center">
                        <span className="text-xs text-gray-500 dark:text-slate-400">Completed</span>
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400">✓</p>
                      </div>
                      <button
                        onClick={() => navigate(`/projects/${project.projectId}`)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default DashboardPage;
