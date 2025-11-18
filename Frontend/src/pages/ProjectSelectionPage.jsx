import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

function ProjectSelectionPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
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
                console.error('Error fetching projects:', err);
                setError('Failed to load projects.');
            } finally {
                setLoading(false);
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
        <Layout title={intendedSection ? getSectionDisplayName(intendedSection) : "Select a Project"}>
            {/* ✅ MATCHES Statistics Page Design Exactly */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-8 border border-gray-200 dark:border-slate-700 transition-colors">
                <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Select a Project</h2>
                <p className="text-gray-600 dark:text-slate-400 mb-4">
                    {intendedSection 
                        ? `Choose a project to view its ${getSectionDisplayName(intendedSection).toLowerCase()}.`
                        : 'Choose a project to view its details.'
                    }
                </p>
                
                {/* Search Bar */}
                <div className="relative mb-6 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search projects by name or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
                
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
                    /* ✅ EXACT SAME GRID AS STATISTICS PAGE */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {projects
                            .filter((proj) => {
                                const searchLower = searchQuery.toLowerCase();
                                return (
                                    proj.name?.toLowerCase().includes(searchLower) ||
                                    proj.location?.toLowerCase().includes(searchLower)
                                );
                            })
                            .map((proj) => (
                                <button
                                    key={proj.projectId}
                                    onClick={() => handleProjectSelect(proj.projectId)}
                                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden text-left transform"
                                >
                                    <div className="p-6">
                                        {/* ✅ EXACT SAME STYLING AS STATISTICS PAGE */}
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
                        {projects.filter((proj) => {
                            const searchLower = searchQuery.toLowerCase();
                            return (
                                proj.name?.toLowerCase().includes(searchLower) ||
                                proj.location?.toLowerCase().includes(searchLower)
                            );
                        }).length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500 dark:text-slate-400">
                                No projects match your search.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default ProjectSelectionPage;