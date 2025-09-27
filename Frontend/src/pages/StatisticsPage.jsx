import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

// Helper function to get the token
const getToken = () => localStorage.getItem('token');

function StatisticsPage() {
    // 1. Get the specific projectId from the URL
    const { projectId } = useParams();
    const navigate = useNavigate();

    // 2. State to hold the data for this ONE project
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]); // State for the project's milestones
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // 3. Fetch data for this specific project when the component loads
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
                // Fetch the main project details
                const projectRes = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
                setProject(projectRes.data);

                // TODO: You will need to build this backend endpoint next
                // For now, it's commented out to prevent errors.
                // const milestonesRes = await axios.get(`http://localhost:5001/api/milestones/project/${projectId}`, config);
                // setMilestones(milestonesRes.data);

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

    // 4. Process the data for the charts (Using placeholder data for now)
    const milestoneStatusData = useMemo(() => {
        if (milestones.length > 0) {
            const statusCounts = milestones.reduce((acc, milestone) => {
                const status = milestone.status || 'Unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
        }
        // Placeholder data
        return [
            { name: 'Completed', value: 2 },
            { name: 'In Progress', value: 3 },
            { name: 'Not Started', value: 5 },
        ];
    }, [milestones]);

    // Placeholder data for Task Priority
    const taskPriorityData = useMemo(() => [
        { name: 'High', value: 5 },
        { name: 'Medium', value: 8 },
        { name: 'Low', value: 12 },
    ], []);
    
    // Placeholder data for Pending Items
    const pendingItemsData = useMemo(() => [
        { name: 'Approvals', value: 4 },
        { name: 'Invoices', value: 2 },
        { name: 'Documents', value: 7 },
    ], []);

    // Placeholder data for Budget Overview
    const budgetData = useMemo(() => {
        const total = project?.contractCost || 1000000;
        const spent = 650000; // This would come from your backend
        return [
            { name: 'Budget', spent, remaining: total - spent, total }
        ];
    }, [project]);

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

                {/* Budget Overview Chart */}
                <div className="bg-white p-6 rounded-xl border shadow-sm md:col-span-2 xl:col-span-3">
                    <h2 className="text-lg font-bold text-center mb-4">BUDGET OVERVIEW</h2>
                    <div className="w-full h-48">
                        <ResponsiveContainer>
                            <BarChart data={budgetData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" hide/>
                                <Tooltip formatter={(value, name) => [`₱${value.toLocaleString()}`, name]} />
                                <Legend />
                                <Bar dataKey="spent" stackId="a" fill="#ef4444" name="Spent" />
                                <Bar dataKey="remaining" stackId="a" fill="#22c55e" name="Remaining" />
                            </BarChart>
                        </ResponsiveContainer>
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
