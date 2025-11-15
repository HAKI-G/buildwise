import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const getToken = () => localStorage.getItem('token');

function StatisticsPage() {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(projectId || null);
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Auto-set task status filter based on project status
    const taskStatusFilter = useMemo(() => {
        if (!project) return 'all';
        if (project.status === 'Completed') return 'completed';
        if (project.status === 'In Progress') return 'in-progress';
        if (project.status === 'Not Started') return 'not-started';
        return 'all';
    }, [project]);

    // Fetch all projects for selection
    useEffect(() => {
        const fetchAllProjects = async () => {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get('http://localhost:5001/api/projects', config);
                setProjects(response.data || []);
            } catch (err) {
                console.error('Error fetching projects:', err);
                setError('Failed to load projects.');
            } finally {
                setLoading(false);
            }
        };

        if (!selectedProjectId) {
            fetchAllProjects();
        }
    }, [selectedProjectId, navigate]);

    // Fetch project statistics when project is selected
    useEffect(() => {
        const fetchProjectStats = async () => {
            setLoading(true);
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                const projectRes = await axios.get(`http://localhost:5001/api/projects/${selectedProjectId}`, config);
                setProject(projectRes.data);

                try {
                    const milestonesRes = await axios.get(`http://localhost:5001/api/milestones/project/${selectedProjectId}`, config);
                    setMilestones(milestonesRes.data || []);
                } catch (err) {
                    console.warn('Could not fetch milestones:', err);
                    setMilestones([]);
                }

                try {
                    const expensesRes = await axios.get(`http://localhost:5001/api/expenses/project/${selectedProjectId}`, config);
                    setExpenses(expensesRes.data || []);
                } catch (err) {
                    console.warn('Could not fetch expenses:', err);
                    setExpenses([]);
                }

                try {
                    const photosRes = await axios.get(`http://localhost:5001/api/photos/project/${selectedProjectId}`, config);
                    setPhotos(photosRes.data || []);
                    console.log('✅ Photos loaded:', photosRes.data?.length);
                } catch (err) {
                    console.warn('Could not fetch photos:', err);
                    setPhotos([]);
                }

            } catch (err) {
                setError('Failed to fetch project statistics.');
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (selectedProjectId) {
            fetchProjectStats();
        }
    }, [selectedProjectId, navigate]);

    // Handle project selection
    const handleProjectSelect = (projectId) => {
        navigate(`/statistics/${projectId}`);
        setSelectedProjectId(projectId);
    };

    // Handle back to project list
    const handleBackToList = () => {
        navigate('/statistics');
        setSelectedProjectId(null);
        setProject(null);
    };

    // ✅ NEW: Calculate overall project completion from task completion percentages
    // ✅ UPDATED: Calculate overall project completion from PHASE averages
const projectProgress = useMemo(() => {
    const phases = milestones.filter(m => m.isPhase === true);
    const tasks = milestones.filter(m => m.isPhase !== true);
    
    if (phases.length === 0) {
        // If no phases, fall back to task average
        if (tasks.length === 0) {
            return {
                overallCompletion: 0,
                completedPhases: 0,
                totalPhases: 0,
                inProgressPhases: 0,
                phaseDetails: []
            };
        }
        
        const taskAvg = Math.round(
            tasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / tasks.length
        );
        
        return {
            overallCompletion: taskAvg,
            completedPhases: 0,
            totalPhases: 0,
            inProgressPhases: 0,
            phaseDetails: []
        };
    }
    
    // ✅ Calculate completion for each phase
    const phaseDetails = phases.map(phase => {
        const phaseTasks = tasks.filter(t => t.parentPhase === phase.milestoneId);
        
        if (phaseTasks.length === 0) {
            return {
                phaseId: phase.milestoneId,
                phaseName: phase.milestoneName,
                completion: 0,
                taskCount: 0
            };
        }
        
        const phaseCompletion = Math.round(
            phaseTasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) / phaseTasks.length
        );
        
        return {
            phaseId: phase.milestoneId,
            phaseName: phase.milestoneName,
            completion: phaseCompletion,
            taskCount: phaseTasks.length
        };
    });
    
    // ✅ Calculate overall completion from phase averages
    const overallCompletion = Math.round(
        phaseDetails.reduce((sum, p) => sum + p.completion, 0) / phases.length
    );
    
    const completedPhases = phaseDetails.filter(p => p.completion >= 100).length;
    const inProgressPhases = phaseDetails.filter(p => p.completion > 0 && p.completion < 100).length;
    
    return {
        overallCompletion,
        completedPhases,
        totalPhases: phases.length,
        inProgressPhases,
        phaseDetails
    };
}, [milestones]);

    // Milestone Status Data - Only count TASKS, not phases
    const milestoneStatusData = useMemo(() => {
        const tasks = milestones.filter(m => m.isPhase !== true);
        
        if (tasks.length > 0) {
            const statusCounts = tasks.reduce((acc, task) => {
                const status = task.status || 'Unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        }
        return [];
    }, [milestones]);

    // Task Priority Data - Only count INCOMPLETE tasks
    const taskPriorityData = useMemo(() => {
        const tasks = milestones.filter(m => m.isPhase !== true);
        
        if (tasks.length > 0) {
            const incompleteTasks = tasks.filter(task => (task.completionPercentage || 0) < 100);
            
            const priorityCounts = incompleteTasks.reduce((acc, task) => {
                const priority = task.priority || 'Medium';
                acc[priority] = (acc[priority] || 0) + 1;
                return acc;
            }, {});
            
            return [
                { name: 'High', value: priorityCounts['High'] || 0 },
                { name: 'Medium', value: priorityCounts['Medium'] || 0 },
                { name: 'Low', value: priorityCounts['Low'] || 0 },
            ].filter(item => item.value > 0);
        }
        return [];
    }, [milestones]);

    // Pending Items Data
    const pendingItemsData = useMemo(() => {
        const pendingApprovals = photos.filter(p => 
            p.confirmationStatus === 'pending' && p.aiProcessed
        ).length;
        
        console.log('📊 Pending Approvals:', pendingApprovals);
        
        return [
            { name: 'Approvals', value: pendingApprovals }
        ];
    }, [photos]);

    const totalSpent = useMemo(() => {
        return expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    }, [expenses]);

    const budgetData = useMemo(() => {
        const total = project?.contractCost || 0;
        const spent = totalSpent;
        const remaining = total - spent;
        const isOverBudget = remaining < 0;
        const overage = Math.abs(remaining);
        
        return {
            total,
            spent,
            remaining: remaining,
            isOverBudget,
            overage,
            percentSpent: total > 0 ? Math.min(((spent / total) * 100), 100).toFixed(1) : 0,
            percentRemaining: total > 0 ? ((Math.max(remaining, 0) / total) * 100).toFixed(1) : 0
        };
    }, [project, totalSpent]);

    const PIE_COLORS_STATUS = ['#22c55e', '#f59e0b', '#6b7280'];
    const PIE_COLORS_PRIORITY = ['#ef4444', '#f59e0b', '#22c55e'];

    // PROJECT SELECTION VIEW
    if (!selectedProjectId) {
        return (
            <Layout title="Statistics">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 border border-gray-200 dark:border-slate-700 transition-colors">
                    <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Select a Project</h2>
                    <p className="text-gray-600 dark:text-slate-400 mb-8">Choose a project to view its statistics and insights.</p>
                    
                    {loading ? (
                        <p className="text-center py-8 text-gray-500 dark:text-slate-400">Loading projects...</p>
                    ) : error ? (
                        <p className="text-center py-8 text-red-500 dark:text-red-400">{error}</p>
                    ) : projects.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-slate-400 mb-4">No projects found.</p>
                            <button 
                                onClick={() => navigate('/projects')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Create Your First Project
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {projects.map((proj) => (
                                <button
                                    key={proj.projectId}
                                    onClick={() => handleProjectSelect(proj.projectId)}
                                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden text-left"
                                >
                                    <div className="p-6">
                                        <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-4">{proj.name}</h3>
                                        <div className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
                                            <div className="flex justify-between">
                                                <span className="font-medium">Location:</span>
                                                <span className="text-right">{proj.location}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-medium">Budget:</span>
                                                <span className="text-right">₱{proj.contractCost ? parseInt(proj.contractCost).toLocaleString() : 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="font-medium">Status:</span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                    proj.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                    proj.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                    'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                                }`}>{proj.status || 'Not Started'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </Layout>
        );
    }

    // STATISTICS VIEW
    if (loading) return <Layout title="Loading..."><p className="text-center p-8 text-gray-500 dark:text-slate-400">Loading project statistics...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center p-8 text-red-500 dark:text-red-400">{error}</p></Layout>;
    if (!project) return <Layout title="No Project"><p className="text-center p-8 text-gray-500 dark:text-slate-400">Project data could not be found.</p></Layout>;

    return (
        <Layout title={`Statistics: ${project.name}`}>
            {/* Back Button & Project Selector */}
            <div className="mb-6 flex items-center justify-between">
                <button
                    onClick={handleBackToList}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-2"
                >
                    ← Back to Project Selection
                </button>
                
                <div className="text-sm text-gray-600 dark:text-slate-400">
                    Viewing: <span className="font-semibold text-gray-800 dark:text-white">{project.name}</span>
                </div>
            </div>

            {/* ✅ NEW: Overall Project Progress Card */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 p-6 rounded-xl shadow-lg mb-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">Overall Project Progress</h2>
                        <p className="text-blue-100 text-sm">Based on task completion percentages</p>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-bold">{projectProgress.overallCompletion}%</div>
                        <p className="text-sm text-blue-100 mt-1">
                            {projectProgress.completedTasks} of {projectProgress.totalTasks} tasks completed
                        </p>
                    </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                    <div 
                        className="bg-white h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${projectProgress.overallCompletion}%` }}
                    >
                        {projectProgress.overallCompletion > 10 && (
                            <span className="text-xs font-bold text-blue-600">
                                {projectProgress.overallCompletion}%
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Task Breakdown - Auto-Highlighted Based on Project Status */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div
                        className={`rounded-lg p-3 text-center transition-all ${
                            taskStatusFilter === 'completed'
                                ? 'bg-white/30 border-2 border-white'
                                : 'bg-white/10 border-2 border-transparent'
                        }`}
                    >
                        <div className="text-2xl font-bold">{projectProgress.completedTasks}</div>
                        <div className="text-xs text-blue-100">Completed</div>
                    </div>
                    <div
                        className={`rounded-lg p-3 text-center transition-all ${
                            taskStatusFilter === 'in-progress'
                                ? 'bg-white/30 border-2 border-white'
                                : 'bg-white/10 border-2 border-transparent'
                        }`}
                    >
                        <div className="text-2xl font-bold">{projectProgress.inProgressTasks}</div>
                        <div className="text-xs text-blue-100">In Progress</div>
                    </div>
                    <div
                        className={`rounded-lg p-3 text-center transition-all ${
                            taskStatusFilter === 'not-started'
                                ? 'bg-white/30 border-2 border-white'
                                : 'bg-white/10 border-2 border-transparent'
                        }`}
                    >
                        <div className="text-2xl font-bold">{projectProgress.notStartedTasks}</div>
                        <div className="text-xs text-blue-100">Not Started</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {/* Milestone Status Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                    <h2 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-white">MILESTONE STATUS</h2>
                    <div className="w-full h-64">
                        {milestoneStatusData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500">
                                <div className="text-center">
                                    <p className="text-lg mb-2">No milestones yet</p>
                                    <p className="text-sm">Add milestones to see statistics</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={milestoneStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {milestoneStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS_STATUS[index % PIE_COLORS_STATUS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Task Priority Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                    <h2 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-white">TASK PRIORITY</h2>
                    <div className="w-full h-64">
                        {taskPriorityData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400 dark:text-slate-500">
                                <div className="text-center">
                                    <p className="text-lg mb-2">No incomplete tasks</p>
                                    <p className="text-sm">All tasks completed or none exist</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={taskPriorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                        {taskPriorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS_PRIORITY[index % PIE_COLORS_PRIORITY.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Pending Items Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                    <h2 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-white">PENDING TASK</h2>
                    <div className="w-full h-64">
                        <ResponsiveContainer>
                            <BarChart data={pendingItemsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Budget Overview */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm md:col-span-2 xl:col-span-3 transition-colors">
                    <h2 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-white">BUDGET OVERVIEW</h2>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Total Budget</p>
                            <p className="text-xl font-bold text-blue-900 dark:text-blue-300">₱{budgetData.total.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Spent ({budgetData.percentSpent}%)</p>
                            <p className="text-xl font-bold text-red-900 dark:text-red-300">₱{budgetData.spent.toLocaleString()}</p>
                        </div>
                        <div className={`text-center p-4 rounded-lg border transition-colors ${
                            budgetData.isOverBudget
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'
                                : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
                        }`}>
                            <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">
                                {budgetData.isOverBudget ? `Over Budget (${budgetData.percentRemaining}%)` : `Remaining (${budgetData.percentRemaining}%)`}
                            </p>
                            <p className={`text-xl font-bold ${
                                budgetData.isOverBudget
                                    ? 'text-orange-900 dark:text-orange-300'
                                    : 'text-green-900 dark:text-green-300'
                            }`}>
                                {budgetData.isOverBudget ? '-₱' : '₱'}{Math.abs(budgetData.remaining).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="w-full h-16 bg-gray-200 dark:bg-slate-700 rounded-lg overflow-hidden flex">
                        {budgetData.spent > 0 && (
                            <div 
                                className={`flex items-center justify-center text-white text-sm font-medium ${
                                    budgetData.isOverBudget ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(budgetData.percentSpent, 100)}%` }}
                                title={`Spent: ₱${budgetData.spent.toLocaleString()}`}
                            >
                                {budgetData.percentSpent > 10 && `${Math.min(budgetData.percentSpent, 100).toFixed(0)}%`}
                            </div>
                        )}
                        {budgetData.remaining > 0 && !budgetData.isOverBudget && (
                            <div 
                                className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
                                style={{ width: `${budgetData.percentRemaining}%` }}
                                title={`Remaining: ₱${budgetData.remaining.toLocaleString()}`}
                            >
                                {budgetData.percentRemaining > 10 && `${budgetData.percentRemaining}%`}
                            </div>
                        )}
                        {budgetData.isOverBudget && (
                            <div 
                                className="bg-red-600 flex items-center justify-center text-white text-sm font-medium"
                                style={{ width: '100%' }}
                                title={`Over Budget by: -₱${budgetData.overage.toLocaleString()}`}
                            >
                                OVER BUDGET
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center">
                            <div className={`w-4 h-4 rounded mr-2 ${budgetData.isOverBudget ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm text-gray-600 dark:text-slate-400">Spent</span>
                        </div>
                        {!budgetData.isOverBudget && (
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                                <span className="text-sm text-gray-600 dark:text-slate-400">Remaining</span>
                            </div>
                        )}
                        {budgetData.isOverBudget && (
                            <div className="flex items-center">
                                <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                                <span className="text-sm text-gray-600 dark:text-slate-400">Over Budget</span>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-4 text-sm text-gray-500 dark:text-slate-400">
                        Total Expenses Logged: {expenses.length}
                    </div>
                </div>

                {/* Task Timeline - Gantt Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm md:col-span-2 xl:col-span-3 transition-colors">
                    <h2 className="text-lg font-bold text-center mb-4 text-gray-800 dark:text-white">TASK TIMELINE - GANTT CHART</h2>
                    {(() => {
                        let tasksWithDates = milestones.filter(m => 
                            !m.isPhase && 
                            m.startDate && 
                            (m.endDate || m.targetDate || m.dueDate) &&
                            (m.milestoneName || m.title)
                        );

                        // Apply task status filter
                        if (taskStatusFilter === 'completed') {
                            tasksWithDates = tasksWithDates.filter(t => t.status === 'completed');
                        } else if (taskStatusFilter === 'in-progress') {
                            tasksWithDates = tasksWithDates.filter(t => t.status === 'in-progress');
                        } else if (taskStatusFilter === 'not-started') {
                            tasksWithDates = tasksWithDates.filter(t => t.status === 'not-started');
                        }

                        if (tasksWithDates.length === 0) {
                            return (
                                <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                                    <p>No tasks to display{taskStatusFilter !== 'all' ? ` with status "${taskStatusFilter}"` : ''} in Gantt chart.</p>
                                    <p className="text-sm mt-2">Add tasks with start and end dates in the project detail view.</p>
                                </div>
                            );
                        }

                        const phases = milestones.filter(m => m.isPhase === true);
                        const allDates = tasksWithDates.flatMap(task => [
                            new Date(task.startDate),
                            new Date(task.endDate || task.targetDate || task.dueDate)
                        ]);
                        
                        const minDate = new Date(Math.min(...allDates));
                        const maxDate = new Date(Math.max(...allDates));
                        const startYear = minDate.getFullYear();
                        const endYear = maxDate.getFullYear();
                        
                        const months = [];
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        
                        for (let year = startYear; year <= endYear; year++) {
                            const startMonth = year === startYear ? minDate.getMonth() : 0;
                            const endMonth = year === endYear ? maxDate.getMonth() : 11;
                            
                            for (let month = startMonth; month <= endMonth; month++) {
                                months.push({
                                    name: monthNames[month],
                                    year: year,
                                    date: new Date(year, month, 1),
                                    fullDate: new Date(year, month + 1, 0)
                                });
                            }
                        }

                        return (
                            <div className="overflow-x-auto">
                                <div style={{ minWidth: `${Math.max(800, months.length * 100 + 200)}px` }}>
                                    <div className="grid gap-0 mb-2" style={{ gridTemplateColumns: `200px repeat(${months.length}, 100px)` }}>
                                        <div className="bg-teal-500 dark:bg-teal-600 text-white text-center py-2 text-xs font-medium sticky left-0 z-10">Task</div>
                                        {months.map((month, index) => (
                                            <div key={index} className="bg-teal-500 dark:bg-teal-600 text-white text-center py-2 text-xs font-medium border-l border-teal-400 dark:border-teal-700">
                                                <div>{month.name}</div>
                                                {(index === 0 || month.name === 'Jan') && <div className="text-xs opacity-75">{month.year}</div>}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {tasksWithDates.map((task) => {
                                        const taskStart = new Date(task.startDate);
                                        const taskEnd = new Date(task.endDate || task.targetDate || task.dueDate);
                                        const parentPhase = phases.find(p => p.milestoneId === task.parentPhase);
                                        const taskColor = parentPhase?.phaseColor || '#6B7280';
                                        
                                        const taskMonths = months.map((month, index) => {
                                            const monthStart = month.date;
                                            const monthEnd = month.fullDate;
                                            
                                            if (taskStart > monthEnd || taskEnd < monthStart) return null;
                                            
                                            const overlapStart = new Date(Math.max(taskStart, monthStart));
                                            const overlapEnd = new Date(Math.min(taskEnd, monthEnd));
                                            const monthDays = monthEnd.getDate();
                                            const startDay = overlapStart.getMonth() === month.date.getMonth() ? overlapStart.getDate() : 1;
                                            const endDay = overlapEnd.getMonth() === month.date.getMonth() ? overlapEnd.getDate() : monthDays;
                                            const leftOffset = ((startDay - 1) / monthDays) * 100;
                                            const rightOffset = ((monthDays - endDay) / monthDays) * 100;
                                            
                                            return {
                                                index,
                                                leftOffset,
                                                rightOffset,
                                                isStart: taskStart.getMonth() === month.date.getMonth() && taskStart.getFullYear() === month.year,
                                                isEnd: taskEnd.getMonth() === month.date.getMonth() && taskEnd.getFullYear() === month.year
                                            };
                                        }).filter(Boolean);
                                        
                                        return (
                                            <div key={task.milestoneId} className="grid gap-0 mb-1" style={{ gridTemplateColumns: `200px repeat(${months.length}, 100px)` }}>
                                                <div className="text-white px-2 py-2 text-xs font-medium flex items-center sticky left-0 z-10" style={{ backgroundColor: taskColor }}>
                                                    <div className="flex items-center w-full min-w-0">
                                                        {task.isKeyMilestone && <span className="mr-1 text-yellow-300 flex-shrink-0">♦</span>}
                                                        <span className="truncate">{task.milestoneName || task.title || task.name}</span>
                                                    </div>
                                                </div>
                                                {months.map((month, monthIndex) => {
                                                    const taskMonth = taskMonths.find(tm => tm.index === monthIndex);
                                                    return (
                                                        <div key={monthIndex} className="bg-gray-200 dark:bg-slate-700 relative h-8 border-l border-gray-300 dark:border-slate-600">
                                                            {taskMonth && (
                                                                <div className="absolute h-4 top-2 opacity-80 rounded-sm" style={{ backgroundColor: taskColor, left: `${taskMonth.leftOffset}%`, right: `${taskMonth.rightOffset}%` }} />
                                                            )}
                                                            {task.isKeyMilestone && taskMonth?.isStart && (
                                                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                                                                    <span className="text-yellow-500 text-sm">♦</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {phases.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-3 justify-center">
                                        {phases.map(phase => (
                                            <div key={phase.milestoneId} className="flex items-center">
                                                <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: phase.phaseColor || '#6B7280' }}></div>
                                                <span className="text-xs text-gray-600 dark:text-slate-400">{phase.milestoneName || phase.title || phase.name || 'Unnamed Phase'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        <div className="mt-4 space-y-2">
                            {projectProgress.phaseDetails.map(phase => (
                                <div key={phase.phaseId} className="bg-white/10 rounded-lg p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-blue-100">{phase.phaseName}</span>
                                        <span className="text-lg font-bold text-white">{phase.completion}%</span>
                                    </div>
                                <div className="text-xs text-blue-200 mt-1">
                                        {phase.taskCount} {phase.taskCount === 1 ? 'task' : 'tasks'}
                                </div>
                            </div>
                            ))}
                        </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </Layout>
    );
}

export default StatisticsPage;