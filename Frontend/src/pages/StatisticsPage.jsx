 import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    }, [projectId, navigate]); // This effect runs every time the projectId in the URL changes

    // 4. Process the data for the charts (Example for milestone status)
    const milestoneStatusData = useMemo(() => {
        // This is placeholder data until you fetch real milestones from your backend.
        // Once you fetch real milestones, this chart will become dynamic.
        if (milestones.length === 0) {
            return [
                { name: 'Completed', value: 2 },
                { name: 'In Progress', value: 3 },
                { name: 'Not Started', value: 5 },
            ];
        }
        
        // This is the logic that will run when you have real milestone data
        const statusCounts = milestones.reduce((acc, milestone) => {
            const status = milestone.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    }, [milestones]);
    
    const COLORS = ['#22c55e', '#f59e0b', '#6b7280'];

    if (loading) return <Layout title="Loading..."><p className="text-center p-8">Loading project statistics...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center p-8 text-red-500">{error}</p></Layout>;
    if (!project) return <Layout title="No Project"><p className="text-center p-8">Project data could not be found.</p></Layout>;

    return (
        <Layout title={`Statistics: ${project.name}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-xl font-bold text-center mb-4">MILESTONE STATUS</h2>
                    <div className="w-full h-64">
                         <ResponsiveContainer>
                            <PieChart>
                                <Pie data={milestoneStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                    {milestoneStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h2 className="text-xl font-bold text-center mb-4">BUDGET OVERVIEW</h2>
                    <div className="flex flex-col items-center justify-center h-64">
                        <p className="text-4xl font-bold text-green-600">
                            {project.contractCost ? `₱${project.contractCost.toLocaleString()}` : 'N/A'}
                        </p>
                        <p className="text-gray-500 mt-2">Total Contract Cost</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default StatisticsPage;