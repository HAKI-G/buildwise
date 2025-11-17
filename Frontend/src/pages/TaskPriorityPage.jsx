import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function TaskPriorityPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                const projectRes = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
                setProject(projectRes.data);

                const milestonesRes = await axios.get(`http://localhost:5001/api/milestones/project/${projectId}`, config);
                setMilestones(milestonesRes.data || []);
                
                localStorage.setItem('lastSelectedProjectId', projectId);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId, navigate]);

    // Calculate task priority data (excluding completed tasks)
    const tasks = milestones.filter(m => !m.isPhase && m.status !== 'completed');
    const priorityData = tasks.reduce((acc, task) => {
        const priority = task.priority || 'Medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
    }, {});

    const chartData = [
        { name: 'High', value: priorityData['High'] || 0 },
        { name: 'Medium', value: priorityData['Medium'] || 0 },
        { name: 'Low', value: priorityData['Low'] || 0 },
    ].filter(item => item.value > 0);

    const COLORS = {
        'High': '#ef4444',
        'Medium': '#f59e0b',
        'Low': '#22c55e'
    };

    if (loading) return <Layout title="Loading..."><p>Loading...</p></Layout>;

    return (
        <Layout title={`Task Priority: ${project?.name || ''}`}>
            <button
                onClick={() => navigate(`/statistics/${projectId}`)}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Statistics Overview
            </button>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Priority Distribution</h2>
                    
                    {chartData.length > 0 ? (
                        <div className="h-80 mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {chartData.map((entry) => (
                                            <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center">
                            <p className="text-gray-500 dark:text-slate-400">No priority data available</p>
                        </div>
                    )}
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                {priorityData['High'] || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">High Priority</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                                {priorityData['Medium'] || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Medium Priority</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {priorityData['Low'] || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Low Priority</p>
                        </div>
                    </div>
                </div>

                {/* Right: Scrollable List with Tabs */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                        Active Tasks ({tasks.length})
                    </h3>
                    
                    {/* Scrollable Content - Grouped by Priority */}
                    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-6">
                        {tasks.length === 0 ? (
                            <p className="text-gray-600 dark:text-slate-400 text-center py-8">
                                No active tasks found.
                            </p>
                        ) : (
                            <>
                                {/* High Priority */}
                                {tasks.filter(t => t.priority === 'High').length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                                            <span className="w-3 h-3 bg-red-600 rounded-full"></span>
                                            High Priority ({tasks.filter(t => t.priority === 'High').length})
                                        </h4>
                                        <div className="space-y-2">
                                            {tasks.filter(t => t.priority === 'High').map((task) => (
                                                <div key={task.milestoneId} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                                                    <p className="font-semibold text-gray-800 dark:text-white text-sm">
                                                        {task.milestoneName || task.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                                        Due: {task.targetDate ? new Date(task.targetDate).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Medium Priority */}
                                {tasks.filter(t => t.priority === 'Medium' || !t.priority).length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-bold text-yellow-600 dark:text-yellow-400 mb-3 flex items-center gap-2">
                                            <span className="w-3 h-3 bg-yellow-600 rounded-full"></span>
                                            Medium Priority ({tasks.filter(t => t.priority === 'Medium' || !t.priority).length})
                                        </h4>
                                        <div className="space-y-2">
                                            {tasks.filter(t => t.priority === 'Medium' || !t.priority).map((task) => (
                                                <div key={task.milestoneId} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                                                    <p className="font-semibold text-gray-800 dark:text-white text-sm">
                                                        {task.milestoneName || task.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                                        Due: {task.targetDate ? new Date(task.targetDate).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Low Priority */}
                                {tasks.filter(t => t.priority === 'Low').length > 0 && (
                                    <div>
                                        <h4 className="text-lg font-bold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                                            <span className="w-3 h-3 bg-green-600 rounded-full"></span>
                                            Low Priority ({tasks.filter(t => t.priority === 'Low').length})
                                        </h4>
                                        <div className="space-y-2">
                                            {tasks.filter(t => t.priority === 'Low').map((task) => (
                                                <div key={task.milestoneId} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                                                    <p className="font-semibold text-gray-800 dark:text-white text-sm">
                                                        {task.milestoneName || task.title}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                                        Due: {task.targetDate ? new Date(task.targetDate).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default TaskPriorityPage;
