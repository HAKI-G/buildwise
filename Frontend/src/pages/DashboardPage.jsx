import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search, RefreshCw } from 'lucide-react';


const getToken = () => localStorage.getItem('token');


// Enhanced ProjectRow component with real progress data
const ProjectRow = ({ project, taskProgress, budgetProgress }) => (
    <div className="block hover:bg-gray-50 dark:hover:bg-slate-700 transition duration-300">
        <div className="flex items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm mb-4">
            
            {/* Project Image Placeholder */}
            <div className="w-12 h-12 rounded-lg mr-4 bg-gray-200 dark:bg-slate-600 flex-shrink-0"></div>
            
            {/* Project Name and Location */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 dark:text-white truncate">{project.name}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{project.location}</p>
            </div>
            
            {/* Task Progress - Real Data */}
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
            
            {/* Budget Progress - Real Data */}
            <div className="w-1/4 mx-4 hidden md:block">
                <div className="flex justify-between text-sm text-gray-500 dark:text-slate-400 mb-1">
                    <span>Budget</span>
                    <span>{budgetProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                            budgetProgress > 90 ? 'bg-red-500' : 
                            budgetProgress > 70 ? 'bg-yellow-500' : 
                            'bg-green-500'
                        }`}
                        style={{ width: `${budgetProgress}%` }}
                    ></div>
                </div>
            </div>
            
            {/* Due Date Display */}
            <div className="w-48 text-center bg-stone-100 dark:bg-slate-700 p-2 rounded-lg mx-4 hidden lg:block">
                <span className="text-gray-800 dark:text-white">
                    Due to {new Date(project.contractCompletionDate || project.createdAt).toLocaleDateString()}
                </span>
            </div>
            
            {/* Status Indicator */}
            <div className="w-20 hidden sm:block">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                    project.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                    {project.status || 'Not Started'}
                </span>
            </div>
        </div>
    </div>
);


function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [projectsWithProgress, setProjectsWithProgress] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();


    // ✅ NEW: Function to fetch all project data
    const fetchProjectsWithProgress = async (showLoadingState = true) => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        
        if (showLoadingState) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Fetch all projects
            const projectsResponse = await axios.get('http://localhost:5001/api/projects', config);
            const projectsData = projectsResponse.data;
            setProjects(projectsData);
            
            // Fetch progress data for each project
            const projectsWithProgressData = await Promise.all(
                projectsData.map(async (project) => {
                    try {
                        // Fetch milestones for task progress
                        const milestonesResponse = await axios.get(
                            `http://localhost:5001/api/milestones/project/${project.projectId}`, 
                            config
                        );
                        const milestones = milestonesResponse.data || [];
                        
                        // ✅ FIX: Only count tasks (not phases) and use lowercase 'completed'
                        const tasks = milestones.filter(m => m.isPhase !== true);
                        const completedTasks = tasks.filter(t => t.status === 'completed').length;
                        const taskProgress = tasks.length > 0 
                            ? Math.round((completedTasks / tasks.length) * 100) 
                            : 0;
                        
                        // Fetch expenses for budget progress
                        const expensesResponse = await axios.get(
                            `http://localhost:5001/api/expenses/project/${project.projectId}`, 
                            config
                        );
                        const expenses = expensesResponse.data || [];
                        
                        // ✅ Calculate budget progress
                        const totalSpent = expenses.reduce((sum, expense) => 
                            sum + (parseFloat(expense.amount) || 0), 0
                        );
                        const budgetProgress = project.contractCost > 0
                            ? Math.min(Math.round((totalSpent / project.contractCost) * 100), 100)
                            : 0;
                        
                        console.log(`📊 Project: ${project.name}`);
                        console.log(`   💰 Total Spent: ₱${totalSpent.toLocaleString()}`);
                        console.log(`   📋 Contract Cost: ₱${project.contractCost?.toLocaleString()}`);
                        console.log(`   📈 Budget Progress: ${budgetProgress}%`);
                        
                        return {
                            ...project,
                            taskProgress,
                            budgetProgress,
                            totalSpent
                        };
                    } catch (err) {
                        console.warn(`Could not fetch progress for project ${project.projectId}:`, err);
                        return {
                            ...project,
                            taskProgress: 0,
                            budgetProgress: 0,
                            totalSpent: 0
                        };
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


    // ✅ Initial load
    useEffect(() => {
        fetchProjectsWithProgress();
    }, []);


    // ✅ NEW: Auto-refresh when navigating back to Dashboard
    useEffect(() => {
        // Only refresh if not initial load
        if (!loading && location.pathname === '/dashboard') {
            console.log('🔄 Dashboard in focus - refreshing data...');
            fetchProjectsWithProgress(false); // Silent refresh without loading spinner
        }
    }, [location.pathname]);


    // ✅ NEW: Manual refresh button handler
    const handleManualRefresh = () => {
        console.log('🔄 Manual refresh triggered');
        fetchProjectsWithProgress(false);
    };


    // Handle search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredProjects(projectsWithProgress);
            return;
        }


        const searchLower = searchQuery.toLowerCase();
        const filtered = projectsWithProgress.filter(project =>
            project.name?.toLowerCase().includes(searchLower) ||
            project.location?.toLowerCase().includes(searchLower) ||
            project.status?.toLowerCase().includes(searchLower)
        );
        setFilteredProjects(filtered);
    }, [searchQuery, projectsWithProgress]);


    // Calculate summary statistics
    const stats = {
        totalProjects: projects.length,
        totalBudget: projects.reduce((sum, p) => sum + (p.contractCost || 0), 0),
        totalSpent: projectsWithProgress.reduce((sum, p) => sum + (p.totalSpent || 0), 0),
        avgCompletion: projectsWithProgress.length > 0
            ? Math.round(projectsWithProgress.reduce((sum, p) => sum + p.taskProgress, 0) / projectsWithProgress.length)
            : 0,
        activeProjects: projects.filter(p => p.status === 'In Progress').length
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
                    
                    {/* ✅ NEW: Manual Refresh Button */}
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalProjects}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Active Projects</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.activeProjects}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Total Budget</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">₱{(stats.totalBudget / 1000000).toFixed(1)}M</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        Spent: ₱{(stats.totalSpent / 1000000).toFixed(1)}M
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">Avg. Completion</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.avgCompletion}%</p>
                </div>
            </div>


            {/* ✅ NEW: Refresh indicator */}
            {isRefreshing && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating project data...
                </div>
            )}


            {/* Projects List */}
            <div>
                <p className="text-gray-500 dark:text-slate-400 font-semibold mb-4">
                    {searchQuery ? `SEARCH RESULTS (${filteredProjects.length})` : `ACTIVE PROJECTS (${projects.length})`}
                </p>
                
                {loading && (
                    <p className="text-center py-8 text-gray-500 dark:text-slate-400">Loading projects...</p>
                )}
                {error && (
                    <p className="text-center py-8 text-red-500 dark:text-red-400">{error}</p>
                )}
                
                {!loading && !error && (
                    <div>
                        {filteredProjects.length > 0 ? (
                            filteredProjects.map(project => (
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
                                    {searchQuery ? 'No projects match your search.' : 'No projects found. Create one on the "Projects" page!'}
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
        </Layout>
    );
}


export default DashboardPage;
