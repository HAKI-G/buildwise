import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { ChevronRight } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function ProjectSelectionPage() {
    const [projects, setProjects] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // ✅ Get the intended section from URL params
    const intendedSection = searchParams.get('section');
    
    // ✅ Get section display name
    const getSectionDisplayName = (section) => {
        const names = {
            'milestones': 'Milestones',
            'updates': 'Updates',
            'photos': 'Photos',
            'reports': 'Reports',
            'comments': 'Comments',
            'documents': 'Documents',
            'maps': 'Maps'
        };
        return names[section] || 'Project Details';
    };

    useEffect(() => {
        const fetchProjects = async () => {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get('http://localhost:5001/api/projects', config);
                setProjects(response.data);
            } catch (err) {
                setError('Could not fetch projects.');
            }
        };
        fetchProjects();
    }, [navigate]);

    // ✅ Handle project selection
    const handleProjectSelect = (projectId) => {
        // Save the selected project to localStorage
        localStorage.setItem('lastSelectedProjectId', projectId);
        
        // Navigate to the intended section
        if (intendedSection) {
            navigate(`/projects/${projectId}/view/${intendedSection}`);
        } else {
            navigate(`/projects/${projectId}`);
        }
    };

    return (
        <Layout title="Select a Project">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <p className="text-gray-600 dark:text-slate-400">
                        {intendedSection 
                            ? `Choose a project to view its ${getSectionDisplayName(intendedSection).toLowerCase()}.`
                            : 'Choose a project to view its statistics and insights.'
                        }
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map((project) => (
                        <button
                            key={project.projectId}
                            onClick={() => handleProjectSelect(project.projectId)}
                            className="group bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {/* Project Name */}
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {project.name}
                                    </h3>
                                    
                                    {/* Location */}
                                    <div className="space-y-1 mb-4">
                                        <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                                            <span className="font-medium mr-2">Location:</span>
                                            <span>{project.location}</span>
                                        </div>
                                        
                                        {/* Budget */}
                                        {project.contractCost && (
                                            <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                                                <span className="font-medium mr-2">Budget:</span>
                                                <span>₱{parseFloat(project.contractCost).toLocaleString()}</span>
                                            </div>
                                        )}
                                        
                                        {/* Status */}
                                        <div className="flex items-center text-sm">
                                            <span className="font-medium mr-2 text-gray-600 dark:text-slate-400">Status:</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                project.status === 'Not Started' 
                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            }`}>
                                                {project.status || 'Not Started'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Arrow Icon */}
                                <div className="ml-4">
                                    <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* No Projects Message */}
                {projects.length === 0 && !error && (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-slate-400">
                            No projects available. Please create a project first.
                        </p>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default ProjectSelectionPage;