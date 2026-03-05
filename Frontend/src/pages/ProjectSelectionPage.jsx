import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Search } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

const statusColors = {
    'Completed':   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'On Hold':     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Overdue':     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    'Not Started': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

function ProjectSelectionPage() {
    const [projects, setProjects]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const navigate                      = useNavigate();
    const location                      = useLocation();
    const [searchParams]                = useSearchParams();

    const isStatisticsMode  = location.pathname === '/statistics';
    const intendedSection   = searchParams.get('section');

    const getSectionDisplayName = (section) => ({
        'milestones': 'Milestones',
        'updates':    'Updates',
        'photos':     'Photos',
        'reports':    'Reports',
        'comments':   'Comments',
        'documents':  'Documents',
        'maps':       'Maps',
    }[section] || 'Project Details');

    useEffect(() => {
        const fetchProjects = async () => {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            try {
                const res = await axios.get('/projects', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setProjects(Array.isArray(res.data) ? res.data : res.data.projects || []);
            } catch (err) {
                console.error('Error fetching projects:', err);
                setError('Failed to load projects.');
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [navigate]);

    const handleProjectSelect = (projectId) => {
        localStorage.setItem('lastSelectedProjectId', projectId);
        if (isStatisticsMode) {
            navigate(`/statistics/${projectId}`);
        } else if (intendedSection) {
            navigate(`/projects/${projectId}/view/${intendedSection}`);
        } else {
            navigate(`/projects/${projectId}`);
        }
    };

    const filteredProjects = projects.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
            p.name?.toLowerCase().includes(q) ||
            p.location?.toLowerCase().includes(q)
        );
    });

    const pageTitle = isStatisticsMode
        ? 'Statistics'
        : intendedSection ? getSectionDisplayName(intendedSection) : 'Select a Project';

    return (
        <Layout title={pageTitle}>
            {/* ── Header row — matches ProjectsPage exactly ── */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {isStatisticsMode ? 'Select a Project' : pageTitle} ({filteredProjects.length})
                </h1>

                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* ── States ── */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : error ? (
                <p className="text-center py-8 text-red-500">{error}</p>
            ) : filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-slate-500">
                    <p className="text-5xl mb-4">🏗️</p>
                    <p className="text-lg font-medium">No projects found</p>
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="mt-3 text-sm text-blue-500 hover:underline">
                            Clear search
                        </button>
                    )}
                </div>
            ) : (
                /* ── Card grid — IDENTICAL to ProjectsPage ── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.projectId}
                            onClick={() => handleProjectSelect(project.projectId)}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col"
                        >
                            {/* Cover Image */}
                            <div className="w-full h-40 bg-gray-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                                {project.projectImage ? (
                                    <img
                                        src={project.projectImage}
                                        alt={project.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300 dark:text-slate-600">
                                        🏗️
                                    </div>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-4 flex flex-col flex-1">
                                {/* Status row */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[project.status] || statusColors['Not Started']}`}>
                                        {project.status || 'Not Started'}
                                    </span>
                                </div>

                                {/* Project Name */}
                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm leading-snug mb-1 line-clamp-2">
                                    {project.name}
                                </h3>

                                {/* Location */}
                                <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-auto pt-2 border-t border-gray-100 dark:border-slate-700">
                                    📍 {project.location || 'No location set'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    );
}

export default ProjectSelectionPage;