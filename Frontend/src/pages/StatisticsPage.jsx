import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const getToken = () => localStorage.getItem('token');

function StatisticsPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [expenses, setExpenses] = useState([]); // NEW: Add expenses state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                
                // Fetch project details
                const projectRes = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
                setProject(projectRes.data);

                // Fetch milestones
                try {
                    const milestonesRes = await axios.get(`http://localhost:5001/api/milestones/project/${projectId}`, config);
                    setMilestones(milestonesRes.data || []);
                } catch (err) {
                    console.warn('Could not fetch milestones:', err);
                    setMilestones([]);
                }

                // NEW: Fetch expenses
                try {
                    const expensesRes = await axios.get(`http://localhost:5001/api/expenses/project/${projectId}`, config);
                    setExpenses(expensesRes.data || []);
                } catch (err) {
                    console.warn('Could not fetch expenses:', err);
                    setExpenses([]);
                }

            } catch (err) {
                setError('Failed to fetch project statistics.');
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchProjectStats();
        }
    }, [projectId, navigate]);

    const milestoneStatusData = useMemo(() => {
        if (milestones.length > 0) {
            const statusCounts = milestones.reduce((acc, milestone) => {
                const status = milestone.status || 'Unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        }
        return [
            { name: 'Completed', value: 2 },
            { name: 'In Progress', value: 3 },
            { name: 'Not Started', value: 5 },
        ];
    }, [milestones]);

    const taskPriorityData = useMemo(() => [
        { name: 'High', value: 5 },
        { name: 'Medium', value: 8 },
        { name: 'Low', value: 12 },
    ], []);
    
    const pendingItemsData = useMemo(() => [
        { name: 'Approvals', value: 4 },
        { name: 'Invoices', value: 2 },
        { name: 'Documents', value: 7 },
    ], []);

    // NEW: Calculate total spent from expenses
    const totalSpent = useMemo(() => {
        return expenses.reduce((sum, expense) => sum + (parseFloat(expense.amount) || 0), 0);
    }, [expenses]);

    // NEW: Budget data now uses real expense totals
    const budgetData = useMemo(() => {
        const total = project?.contractCost || 0;
        const spent = totalSpent;
        const remaining = total - spent;
        
        return {
            total,
            spent,
            remaining: remaining > 0 ? remaining : 0,
            percentSpent: total > 0 ? ((spent / total) * 100).toFixed(1) : 0,
            percentRemaining: total > 0 ? ((remaining / total) * 100).toFixed(1) : 0
        };
    }, [project, totalSpent]);

    const PIE_COLORS_STATUS = ['#22c55e', '#f59e0b', '#6b7280'];
    const PIE_COLORS_PRIORITY = ['#ef4444', '#f59e0b', '#22c55e'];

    if (loading) return <Layout title="Loading..."><p className="text-center p-8">Loading project statistics...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center p-8 text-red-500">{error}</p></Layout>;
    if (!project) return <Layout title="No Project"><p className="text-center p-8">Project data could not be found.</p></Layout>;

    return (
        <Layout title={`Statistics: ${project.name}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                {/* Milestone Status Chart */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-bold text-center mb-4">MILESTONE STATUS</h2>
                    <div className="w-full h-64">
                         <ResponsiveContainer>
                            <PieChart>
                                <Pie data={milestoneStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {milestoneStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS_STATUS[index % PIE_COLORS_STATUS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Task Priority Chart */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-lg font-bold text-center mb-4">TASK PRIORITY</h2>
                    <div className="w-full h-64">
                         <ResponsiveContainer>
                            <PieChart>
                                <Pie data={taskPriorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {taskPriorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS_PRIORITY[index % PIE_COLORS_PRIORITY.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pending Items Chart */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                     <h2 className="text-lg font-bold text-center mb-4">PENDING ITEMS</h2>
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

                {/* NEW: Enhanced Budget Overview with Real Data */}
                <div className="bg-white p-6 rounded-xl border shadow-sm md:col-span-2 xl:col-span-3">
                    <h2 className="text-lg font-bold text-center mb-4">BUDGET OVERVIEW</h2>
                    
                    {/* Budget Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Total Budget</p>
                            <p className="text-xl font-bold text-blue-900">₱{budgetData.total.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Spent ({budgetData.percentSpent}%)</p>
                            <p className="text-xl font-bold text-red-900">₱{budgetData.spent.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-600 mb-1">Remaining ({budgetData.percentRemaining}%)</p>
                            <p className="text-xl font-bold text-green-900">₱{budgetData.remaining.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Visual Budget Bar */}
                    <div className="w-full h-16 bg-gray-200 rounded-lg overflow-hidden flex">
                        {budgetData.spent > 0 && (
                            <div 
                                className="bg-red-500 flex items-center justify-center text-white text-sm font-medium"
                                style={{ width: `${budgetData.percentSpent}%` }}
                                title={`Spent: ₱${budgetData.spent.toLocaleString()}`}
                            >
                                {budgetData.percentSpent > 10 && `${budgetData.percentSpent}%`}
                            </div>
                        )}
                        {budgetData.remaining > 0 && (
                            <div 
                                className="bg-green-500 flex items-center justify-center text-white text-sm font-medium"
                                style={{ width: `${budgetData.percentRemaining}%` }}
                                title={`Remaining: ₱${budgetData.remaining.toLocaleString()}`}
                            >
                                {budgetData.percentRemaining > 10 && `${budgetData.percentRemaining}%`}
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-600">Spent</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                            <span className="text-sm text-gray-600">Remaining</span>
                        </div>
                    </div>

                    {/* Expense Count */}
                    <div className="text-center mt-4 text-sm text-gray-500">
                        Total Expenses Logged: {expenses.length}
                    </div>
                </div>

                {/* Task Timeline - Placeholder */}
                <div className="bg-white p-6 rounded-xl border shadow-sm md:col-span-2 xl:col-span-3">
                    <h2 className="text-lg font-bold text-center mb-4">TASK TIMELINE</h2>
                    <div className="w-full h-64 flex items-center justify-center text-gray-400">
                        <p>Gantt chart component will go here.</p>
                    </div>
                </div>

            </div>
        </Layout>
    );
}

export default StatisticsPage;