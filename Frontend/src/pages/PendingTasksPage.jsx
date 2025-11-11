import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Clock, Image as ImageIcon } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function PendingTasksPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [photos, setPhotos] = useState([]);
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

                const photosRes = await axios.get(`http://localhost:5001/api/photos/project/${projectId}`, config);
                setPhotos(photosRes.data || []);
                
                localStorage.setItem('lastSelectedProjectId', projectId);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId, navigate]);

    // Calculate pending approvals
    const pendingApprovals = photos.filter(p => p.confirmationStatus === 'pending' && p.aiProcessed);
    const approvedPhotos = photos.filter(p => p.confirmationStatus === 'approved');
    const rejectedPhotos = photos.filter(p => p.confirmationStatus === 'rejected');

    const chartData = [
        { name: 'Pending', value: pendingApprovals.length, fill: '#f59e0b' },
        { name: 'Approved', value: approvedPhotos.length, fill: '#22c55e' },
        { name: 'Rejected', value: rejectedPhotos.length, fill: '#ef4444' }
    ];

    if (loading) return <Layout title="Loading..."><p>Loading...</p></Layout>;

    return (
        <Layout title={`Pending Tasks: ${project?.name || ''}`}>
            <button
                onClick={() => navigate(`/statistics/${projectId}`)}
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Statistics Overview
            </button>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-250px)]">
                {/* Left: Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Approval Status</h2>
                    <div className="flex-1 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        border: '1px solid #475569',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                {pendingApprovals.length}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400">Pending</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {approvedPhotos.length}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400">Approved</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                {rejectedPhotos.length}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-slate-400">Rejected</p>
                        </div>
                    </div>
                </div>

                {/* Right: Scrollable Pending Approvals */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        Pending Approvals ({pendingApprovals.length})
                    </h3>
                    
                    {/* Scrollable Photo Grid */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        {pendingApprovals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 dark:text-slate-400">
                                <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                                <p>No pending approvals at this time.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {pendingApprovals.map((photo) => (
                                    <div
                                        key={photo.photoId}
                                        className="bg-gray-50 dark:bg-slate-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                                    >
                                        <img
                                            src={photo.photoUrl}
                                            alt="Pending approval"
                                            className="w-full h-48 object-cover"
                                        />
                                        <div className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded font-medium">
                                                    Pending Approval
                                                </span>
                                                <p className="text-xs text-gray-600 dark:text-slate-400">
                                                    {new Date(photo.uploadDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {photo.description && (
                                                <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">
                                                    {photo.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default PendingTasksPage;
