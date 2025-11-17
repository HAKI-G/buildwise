import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function MilestoneStatusPage() {
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

    // Calculate milestone status data
    const milestoneStatusData = milestones
        .filter(m => !m.isPhase)
        .reduce((acc, milestone) => {
            const status = milestone.status || 'not started';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

    const chartData = Object.entries(milestoneStatusData).map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value 
    }));
    
    const COLORS = {
        'completed': '#22c55e',
        'Completed': '#22c55e',
        'in progress': '#3b82f6',
        'In progress': '#3b82f6',
        'not started': '#ef4444',
        'Not started': '#ef4444',
        'Unknown': '#6b7280'
    };

    if (loading) return <Layout title="Loading..."><p>Loading...</p></Layout>;

    return (
        <Layout title={`Milestone Status: ${project?.name || ''}`}>
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
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Status Distribution</h2>
                    
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
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || COLORS['Unknown']} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center">
                            <p className="text-gray-500 dark:text-slate-400">No milestone data available</p>
                        </div>
                    )}
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-slate-700">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                {milestoneStatusData['completed'] || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Completed</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {milestoneStatusData['in progress'] || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">In Progress</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                {milestoneStatusData['not started'] || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Not Started</p>
                        </div>
                    </div>
                </div>

                {/* Right: Scrollable List */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                        All Milestones ({milestones.filter(m => !m.isPhase).length})
                    </h3>
                    
                    {/* Scrollable Content */}
                    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-3">
                        {milestones.filter(m => !m.isPhase).length === 0 ? (
                            <p className="text-gray-600 dark:text-slate-400 text-center py-8">
                                No milestones found for this project.
                            </p>
                        ) : (
                            milestones.filter(m => !m.isPhase).map((milestone) => (
                                <div
                                    key={milestone.milestoneId}
                                    className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-gray-800 dark:text-white flex-1">
                                            {milestone.milestoneName || milestone.title}
                                        </h4>
                                        <span
                                            className={`ml-2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                                milestone.status === 'completed'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                    : milestone.status === 'in progress'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}
                                        >
                                            {milestone.status || 'not started'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <p className="text-gray-600 dark:text-slate-400">
                                            Due: {milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString() : 'N/A'}
                                        </p>
                                        {milestone.plannedCost && (
                                            <p className="text-gray-600 dark:text-slate-400">
                                                ₱{Number(milestone.plannedCost).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default MilestoneStatusPage;
