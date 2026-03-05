import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search, RefreshCw, FolderKanban, Rocket, Wallet, TrendingUp, AlertTriangle, CheckCircle2, Clock, ArrowUpDown, ListFilter, SlidersHorizontal, ChevronDown } from 'lucide-react';

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

  const createdDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : null;
  const startDate = project.contractStartDate ? new Date(project.contractStartDate).toLocaleDateString() : null;

  return (
  <div className="block hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-300">
    <div className={`rounded-xl border shadow-sm mb-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
      isOverBudget
        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500'
    }`}>
      {/* Top Row: Image, Name, Progress, Budget, Due Date, Status */}
      <div className="flex items-center p-4">
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
        </div>

        <div className="w-1/4 mx-4 hidden md:block">
          <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400 mb-1">
            <span>Progress</span>
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
          <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-gray-500 dark:text-slate-400">Budget</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-slate-400">{budgetProgress}%</span>
              {isOverBudget && (
                <span className="text-xs text-red-600 dark:text-red-400 font-bold">
                  +₱{overageAmount.toLocaleString('en-US', {maximumFractionDigits: 0})}
                </span>
              )}
            </div>
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
          {(() => {
            const dueDate = new Date(project.contractCompletionDate || project.createdAt);
            const now = new Date();
            const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays < 0 && project.status !== 'Completed';
            return (
              <div>
                <span className="text-gray-800 dark:text-white text-xs">
                  Due {dueDate.toLocaleDateString()}
                </span>
                {project.status !== 'Completed' && (
                  <p className={`text-xs font-semibold mt-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : diffDays <= 30 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {isOverdue ? `${Math.abs(diffDays)} days overdue` : `${diffDays} days left`}
                  </p>
                )}
              </div>
            );
          })()}
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

      {/* Bottom Row: Project Details */}
      <div className="px-4 pb-3 pt-0 border-t border-gray-100 dark:border-slate-700/50">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-slate-400 mt-2">
          {createdDate && (
            <span className="flex items-center gap-1">
              <span>📅</span> Created: <span className="font-medium text-gray-700 dark:text-slate-300">{createdDate}</span>
            </span>
          )}
          {startDate && (
            <span className="flex items-center gap-1">
              <span>🚀</span> Start: <span className="font-medium text-gray-700 dark:text-slate-300">{startDate}</span>
            </span>
          )}
          {contractCost > 0 && (
            <span className="flex items-center gap-1">
              <span>💰</span> Contract: <span className="font-medium text-gray-700 dark:text-slate-300">{formatBudget(contractCost)}</span>
            </span>
          )}
          {spent > 0 && (
            <span className="flex items-center gap-1">
              <span>📊</span> Spent: <span className={`font-medium ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-slate-300'}`}>{formatBudget(spent)}</span>
            </span>
          )}
          {project.contractor && (
            <span className="flex items-center gap-1">
              <span>🏗️</span> Contractor: <span className="font-medium text-gray-700 dark:text-slate-300 truncate max-w-[150px]">{project.contractor}</span>
            </span>
          )}
          {project.projectManager && (
            <span className="flex items-center gap-1">
              <span>👷</span> PM: <span className="font-medium text-gray-700 dark:text-slate-300 truncate max-w-[150px]">{project.projectManager}</span>
            </span>
          )}
        </div>
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
  const [sortBy, setSortBy] = useState('name'); // 'name', 'date', 'progress', 'budget'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed', 'overbudget'
  const showOverBudgetOnly = statusFilter === 'overbudget';
  const showCompletedOnly = statusFilter === 'completed';
  const showActiveOnly = statusFilter === 'active';
  const [visibleCount, setVisibleCount] = useState(5); // S1: Limit items shown in project list

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

      const projectsResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/projects`, config);
      const projectsData = projectsResponse.data;
      setProjects(projectsData);

      const projectsWithProgressData = await Promise.all(
        projectsData.map(async (project) => {
          try {
            const milestonesResponse = await axios.get(
              `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/milestones/project/${project.projectId}`,
              config
            );
            const milestones = milestonesResponse.data || [];

            // ✅ Calculate project progress based on PHASE averages (not individual tasks)
            const phases = milestones.filter((m) => m.isPhase === true);
            const tasks = milestones.filter((m) => m.isPhase !== true);
            
            let taskProgress = 0;
            
            if (phases.length > 0) {
              // Group tasks by phase and calculate each phase's average
              const phaseAverages = phases.map(phase => {
                const phaseTasks = tasks.filter(task => task.parentPhase === phase.milestoneId);
                
                if (phaseTasks.length === 0) return 0;
                
                const totalCompletion = phaseTasks.reduce((sum, task) => {
                  return sum + (task.completionPercentage || 0);
                }, 0);
                
                return totalCompletion / phaseTasks.length;
              });
              
              // Calculate project progress as average of all phase averages
              const totalPhaseCompletion = phaseAverages.reduce((sum, avg) => sum + avg, 0);
              taskProgress = Math.round(totalPhaseCompletion / phases.length);
            } else if (tasks.length > 0) {
              // Fallback: If no phases, calculate from tasks directly
              const totalCompletion = tasks.reduce((sum, task) => {
                return sum + (task.completionPercentage || 0);
              }, 0);
              taskProgress = Math.round(totalCompletion / tasks.length);
            }

            const expensesResponse = await axios.get(
              `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/expenses/project/${project.projectId}`,
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

    // Apply status filter
    if (statusFilter === 'overbudget') {
      results = results.filter((p) => {
        const contractCost = typeof p.contractCost === 'string' 
          ? parseFloat(p.contractCost.replace(/[^0-9.-]/g, '')) 
          : (p.contractCost || 0);
        const spent = typeof p.totalSpent === 'string'
          ? parseFloat(p.totalSpent.replace(/[^0-9.-]/g, ''))
          : (p.totalSpent || 0);
        return spent > contractCost;
      });
    } else if (statusFilter === 'completed') {
      results = results.filter((p) => p.status === 'Completed');
    } else if (statusFilter === 'active') {
      results = results.filter((p) => p.status !== 'Completed');
    }

    // Sorting
    results.sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'name') {
        compareValue = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'date') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        compareValue = dateA - dateB;
      } else if (sortBy === 'progress') {
        compareValue = (a.taskProgress || 0) - (b.taskProgress || 0);
      } else if (sortBy === 'budget') {
        const costA = typeof a.contractCost === 'string' ? parseFloat(a.contractCost.replace(/[^0-9.-]/g, '')) : (a.contractCost || 0);
        const costB = typeof b.contractCost === 'string' ? parseFloat(b.contractCost.replace(/[^0-9.-]/g, '')) : (b.contractCost || 0);
        compareValue = costA - costB;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredProjects(results);
    setVisibleCount(5);
  }, [searchQuery, projectsWithProgress, sortBy, sortOrder, statusFilter]);

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
    completedProjects: projects.filter((p) => p.status === 'Completed').length,
    notStartedProjects: projects.filter((p) => p.status === 'Not Started' || !p.status).length,
    overdueProjects: projects.filter((p) => {
      if (p.status === 'Completed') return false;
      const dueDate = new Date(p.contractCompletionDate);
      return dueDate < new Date() && !isNaN(dueDate.getTime());
    }).length,
    overBudgetProjects: projectsWithProgress.filter((p) => {
      const cost = typeof p.contractCost === 'string' ? parseFloat(p.contractCost.replace(/[^0-9.-]/g, '')) : (p.contractCost || 0);
      const spent = typeof p.totalSpent === 'string' ? parseFloat(p.totalSpent.replace(/[^0-9.-]/g, '')) : (p.totalSpent || 0);
      return spent > cost && cost > 0;
    }).length,
  };

  return (
    <Layout
      title="Dashboard"
      headerContent={
        <div className="relative flex-1 max-w-xl ml-4 sm:ml-8 flex items-center gap-2 sm:gap-4">
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
        <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/5 to-transparent dark:from-indigo-400/5 rounded-bl-full" />
          <div className="p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
                Total
              </span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {stats.totalProjects}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1 mb-3">Total Projects</p>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle2 className="w-3 h-3" />{stats.completedProjects} done</span>
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><Rocket className="w-3 h-3" />{stats.activeProjects} active</span>
              <span className="flex items-center gap-1 text-gray-400 dark:text-slate-500"><Clock className="w-3 h-3" />{stats.notStartedProjects} pending</span>
            </div>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-400" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/5 to-transparent dark:from-blue-400/5 rounded-bl-full" />
          <div className="p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              {stats.overdueProjects > 0 ? (
                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />{stats.overdueProjects} overdue
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />On track
                </span>
              )}
            </div>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {stats.activeProjects}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1 mb-3">Active Projects</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-700" style={{ width: stats.totalProjects > 0 ? `${(stats.activeProjects / stats.totalProjects) * 100}%` : '0%' }} />
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">{stats.totalProjects > 0 ? Math.round((stats.activeProjects / stats.totalProjects) * 100) : 0}%</span>
            </div>
          </div>
        </div>

        {/* Total Budget Card */}
        <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-400" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/5 to-transparent dark:from-emerald-400/5 rounded-bl-full" />
          <div className="p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              {stats.overBudgetProjects > 0 ? (
                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />{stats.overBudgetProjects} over
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">Budget</span>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600/70 dark:text-emerald-400/70">Allocated</p>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate">
                  {formatBudget(stats.totalBudget)}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700/50">
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-slate-500">Spent</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    {formatBudget(stats.totalSpent)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full border-[3px] border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.totalBudget > 0 ? Math.round((stats.totalSpent / stats.totalBudget) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Avg. Completion Card */}
        <div className="group relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-gray-200/80 dark:border-slate-700/60 shadow-sm hover:shadow-xl hover:shadow-violet-500/5 dark:hover:shadow-violet-500/10 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-400" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/5 to-transparent dark:from-violet-400/5 rounded-bl-full" />
          <div className="p-5 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2.5 py-1 rounded-full">Avg.</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {stats.avgCompletion}%
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1 mb-3">Avg. Completion</p>
            <div className="space-y-1.5">
              <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${stats.avgCompletion}%` }}
                />
              </div>
              <p className="text-[11px] text-violet-600 dark:text-violet-400">Overall progress across all projects</p>
            </div>
          </div>
        </div>
      </div>

      {isRefreshing && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Updating project data...
        </div>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-gray-200/80 dark:border-slate-700/60 p-1 shadow-sm">
          {[
            { key: 'all', label: 'All', icon: null },
            { key: 'active', label: 'Active', color: 'text-blue-600 dark:text-blue-400' },
            { key: 'completed', label: 'Completed', color: 'text-green-600 dark:text-green-400' },
            { key: 'overbudget', label: 'Over Budget', color: 'text-red-600 dark:text-red-400' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(statusFilter === tab.key ? 'all' : tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === tab.key
                  ? tab.key === 'overbudget' ? 'bg-red-500 text-white shadow-sm'
                    : tab.key === 'completed' ? 'bg-green-500 text-white shadow-sm'
                    : tab.key === 'active' ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-gray-200/80 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 dark:text-slate-500 border-r border-gray-200 dark:border-slate-700">
              <ArrowUpDown className="w-3 h-3" />
              <span className="font-medium hidden sm:inline">Sort</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1.5 bg-white dark:bg-slate-800 text-xs font-medium text-gray-700 dark:text-slate-300 focus:outline-none cursor-pointer appearance-none pr-5 rounded-none"
              style={{ backgroundImage: 'none' }}
            >
              <option value="name">Name</option>
              <option value="date">Date Created</option>
              <option value="progress">Progress</option>
              <option value="budget">Budget</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/50 border-l border-gray-200 dark:border-slate-700 transition-colors"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Count Badge */}
        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div>
        {/* Active Projects Section */}
        <div>
          <p className="text-gray-500 dark:text-slate-400 font-semibold mb-4">
            {showOverBudgetOnly
              ? `OVER BUDGET PROJECTS (${filteredProjects.length})`
              : showCompletedOnly
              ? `COMPLETED PROJECTS (${filteredProjects.length})`
              : showActiveOnly
              ? `ACTIVE PROJECTS (${filteredProjects.length})`
              : `ALL PROJECTS (${filteredProjects.length})`}
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
              {filteredProjects.length > 0 ? (
                <>
                  {filteredProjects.slice(0, visibleCount).map((project) => (
                    <ProjectRow
                      key={project.projectId}
                      project={project}
                      taskProgress={project.taskProgress}
                      budgetProgress={project.budgetProgress}
                      totalSpent={project.totalSpent}
                    />
                  ))}
                  {/* S1: Show More / Show Less buttons */}
                  {filteredProjects.length > 5 && (
                    <div className="flex justify-center gap-3 mt-4">
                      {visibleCount < filteredProjects.length && (
                        <button
                          onClick={() => setVisibleCount(prev => Math.min(prev + 5, filteredProjects.length))}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Show More ({filteredProjects.length - visibleCount} remaining)
                        </button>
                      )}
                      {visibleCount > 5 && (
                        <button
                          onClick={() => setVisibleCount(5)}
                          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                        >
                          Show Less
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 transition-colors">
                  <p className="text-gray-500 dark:text-slate-400 mb-4">
                    {showOverBudgetOnly
                      ? 'No over-budget projects found.'
                      : showCompletedOnly
                      ? 'No completed projects found.'
                      : showActiveOnly
                      ? 'No active projects found.'
                      : 'No projects found.'}
                  </p>
                  {showActiveOnly && (
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
        {!showCompletedOnly && !showOverBudgetOnly && !showActiveOnly && !loading && !error && projectsWithProgress.filter(p => p.status === 'Completed').length > 0 && (
          <div className="mt-8">
            <p className="text-gray-500 dark:text-slate-400 font-semibold mb-4">
              COMPLETED PROJECTS ({projectsWithProgress.filter(p => p.status === 'Completed').length})
            </p>
            <div>
              {projectsWithProgress.filter(p => p.status === 'Completed').slice(0, 5).map((project) => (
                <div key={project.projectId} className="block hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-300">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-4 hover:shadow-lg hover:scale-[1.02] hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300">
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
