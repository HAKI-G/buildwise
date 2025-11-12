import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';
import Comments from '../components/Comments.jsx';
import StatusDropdown from '../components/StatusDropdown.jsx';
import { MessageSquare, MapPin, Calendar } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function CommentsViewPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    const handleStatusChange = (newStatus) => {
        setProject(prev => ({ ...prev, status: newStatus }));
    };

    if (loading) {
        return (
            <Layout title="Loading...">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                        <p className="text-gray-500 dark:text-slate-400">Loading...</p>
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

    return (
        <Layout title={`Comments - ${project?.name || 'Project'}`}>
            <div className="space-y-6">
                {/* Project Info Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-6 h-6" />
                                <h2 className="text-2xl font-bold">{project?.name}</h2>
                            </div>
                            <div className="flex flex-wrap gap-4 text-indigo-100">
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
                                        <span className="text-sm">
                                            Due: {new Date(project.contractCompletionDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Status Dropdown */}
                        <StatusDropdown 
                            projectId={projectId}
                            currentStatus={project?.status}
                            onStatusChange={handleStatusChange}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                    <Comments projectId={projectId} />
                </div>
            </div>
        </Layout>
    );
}

export default CommentsViewPage;
