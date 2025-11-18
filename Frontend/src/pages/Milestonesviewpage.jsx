import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';
import Milestones from '../components/Milestones.jsx';
import { Target, MapPin, Calendar, ChevronDown } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function MilestonesViewPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [initialViewMode] = useState(searchParams.get('view') || 'table');

    // ✅ Get status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed':
                return 'bg-green-500/20 text-green-100 border-green-400';
            case 'In Progress':
                return 'bg-blue-500/20 text-blue-100 border-blue-400';
            case 'Overdue':
                return 'bg-red-500/20 text-red-100 border-red-400';
            case 'On Hold':
                return 'bg-orange-500/20 text-orange-100 border-orange-400';
            default:
                return 'bg-yellow-500/20 text-yellow-100 border-yellow-400';
        }
    };

    // ✅ Handle status change
    const handleStatusChange = async (newStatus) => {
        setIsUpdatingStatus(true);
        const token = getToken();
        
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Update status via API
            await axios.patch(
                `http://localhost:5001/api/projects/${projectId}`,
                { status: newStatus },
                config
            );
            
            // Update local state
            setProject(prev => ({ ...prev, status: newStatus }));
            
            console.log('✅ Status updated successfully');
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    useEffect(() => {
        const fetchProject = async () => {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
                setProject(response.data);
                
                // Store last selected project
                localStorage.setItem('lastSelectedProjectId', projectId);
            } catch (error) {
                console.error('Error fetching project:', error);
                setError('Failed to load project. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId, navigate]);

    if (loading) {
        return (
            <Layout title="Loading...">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                        <p className="text-gray-500 dark:text-slate-400">Loading milestones...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout title="Error">
                <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/projects')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </Layout>
        );
    }

    const displayStatus = project?.status || 'Not Started';

    return (
        <Layout title={`Milestones - ${project?.name || 'Project'}`}>
            <div className="space-y-6">
                {/* Project Info Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Target className="w-6 h-6" />
                                <h2 className="text-2xl font-bold">{project?.name}</h2>
                            </div>
                            <div className="flex flex-wrap gap-4 text-blue-100">
                                {project?.location && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span className="text-sm">{project.location}</span>
                                    </div>
                                )}
                                {project?.contractCost && (
                                    <span className="text-sm">₱{parseFloat(project.contractCost).toLocaleString()}</span>
                                )}
                                {project?.contractCompletionDate && (
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-sm">Due: {new Date(project.contractCompletionDate).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* ✅ Status Dropdown */}
                        <div className="relative group">
                            <button 
                                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 flex items-center gap-2 ${getStatusColor(displayStatus)} hover:opacity-80 transition-all`}
                                disabled={isUpdatingStatus}
                            >
                                {isUpdatingStatus ? 'Updating...' : displayStatus}
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            
                            {/* Dropdown Menu */}
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <div className="py-2">
                                    {['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(status)}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                                                displayStatus === status 
                                                    ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold' 
                                                    : 'text-gray-700 dark:text-slate-300'
                                            }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Milestones Content */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                    <Milestones projectId={projectId} initialViewMode={initialViewMode} />
                </div>
            </div>
        </Layout>
    );
}

export default MilestonesViewPage;