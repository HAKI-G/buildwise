import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';
import { ArrowLeft } from 'lucide-react';

import Milestones from '../components/Milestones.jsx';
import Updates from '../components/Updates.jsx';
import Photos from '../components/Photos.jsx';
import Comments from '../components/Comments.jsx';
import Documents from '../components/Documents.jsx';
import Maps from '../components/Maps.jsx';
import Reports from '../components/Reports.jsx';

const getToken = () => localStorage.getItem('token');

// ✅ Profile field with hover tooltip
const ProfileItem = ({ label, value }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    return (
        <div className="group relative" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-base font-medium text-gray-800 dark:text-white truncate">{value}</div>
            <div className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-slate-700 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap pointer-events-none transition-all duration-200 ${showTooltip && value && value !== 'N/A' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                {value}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="border-[6px] border-transparent border-t-gray-900 dark:border-t-slate-700"></div>
                </div>
            </div>
        </div>
    );
};

// ✅ Tab button — no URL navigation, just state
const TabButton = ({ label, activeTab, setActiveTab }) => {
    const tabName = label.toLowerCase();
    return (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors duration-200 whitespace-nowrap ${
                activeTab === tabName
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
            }`}
        >
            {label}
        </button>
    );
};

function ProjectDetailPage() {
    const { projectId, tab } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(null);
    const [activeTab, setActiveTab] = useState(tab || 'milestones');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [projectStatus, setProjectStatus] = useState('Not Started');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const formatNumberWithCommas = (value) => {
        if (!value) return 'N/A';
        const number = value.toString().replace(/\D/g, '');
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const fetchProjectData = useCallback(async () => {
        const token = getToken();
        if (!token) { navigate('/login'); return; }
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const projectRes = await axios.get(`/projects/${projectId}`, config);
            setProject(projectRes.data);
            setProjectStatus(projectRes.data.status || 'Not Started');
            localStorage.setItem('lastSelectedProjectId', projectId);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
            else setError('Failed to fetch project details.');
        } finally {
            setLoading(false);
        }
    }, [projectId, navigate]);

    useEffect(() => { fetchProjectData(); }, [fetchProjectData]);

    const handleStatusChange = async (newStatus) => {
        if (!project) return;
        if (newStatus === 'Completed') {
            const confirmed = window.confirm('Are you sure you want to mark this project as COMPLETED? This should only be done after final VP approval.');
            if (!confirmed) return;
        }
        setIsUpdatingStatus(true);
        try {
            const token = getToken();
            await axios.patch(
                `/projects/${project.projectId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setProjectStatus(newStatus);
            fetchProjectData();
        } catch (err) {
            alert('Failed to update project status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const renderTabContent = () => {
        const isReadonly = project && project.status === 'Completed' && localStorage.getItem('userRole') !== 'Admin';
        switch (activeTab) {
            case 'milestones':  return <Milestones projectId={projectId} readonly={isReadonly} />;
            case 'updates':     return <Updates projectId={projectId} readonly={isReadonly} />;
            case 'photos':      return <Photos projectId={projectId} readonly={isReadonly} />;
            case 'reports':     return <Reports projectId={projectId} />;
            case 'comments':    return <Comments projectId={projectId} readonly={isReadonly} />;
            case 'documents':   return <Documents projectId={projectId} readonly={isReadonly} />;
            case 'maps':        return <Maps projectId={projectId} />;
            default:            return <Milestones projectId={projectId} readonly={isReadonly} />;
        }
    };

    if (loading) return <Layout title="Loading..."><p className="text-center p-8 text-gray-500 dark:text-slate-400">Loading project details...</p></Layout>;
    if (error)   return <Layout title="Error"><p className="text-center text-red-500 p-8">{error}</p></Layout>;

    const statusColors = {
        'Not Started': 'bg-gray-500 border-gray-600',
        'In Progress':  'bg-blue-600 border-blue-700',
        'On Hold':      'bg-yellow-600 border-yellow-700',
        'Overdue':      'bg-red-600 border-red-700',
        'Completed':    'bg-green-600 border-green-700',
    };

    return (
        <Layout title={project?.name || 'Project Details'}>

            {/* ✅ Back button */}
            <button
                onClick={() => navigate('/projects')}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Projects
            </button>

            {/* ✅ Project Profile Card */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
                    {/* Project Image */}
                    {project?.projectImage && (
                        <img
                            src={project.projectImage}
                            alt={project.name}
                            className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200 dark:border-slate-600 flex-shrink-0"
                        />
                    )}

                    {/* Title + Status */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate mb-1">{project?.name}</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">{project?.location}</p>

                        {/* Status Selector */}
                        <div className="flex items-center gap-3">
                            <select
                                value={projectStatus}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={isUpdatingStatus}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white border-2 cursor-pointer appearance-none
                                    ${statusColors[projectStatus] || statusColors['Not Started']}
                                    ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
                                `}
                            >
                                <option value="Not Started">Not Started</option>
                                <option value="In Progress">In Progress</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Completed">Completed</option>
                            </select>
                            {isUpdatingStatus && <span className="text-xs text-gray-400">Updating...</span>}
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-5">
                    <ProfileItem label="Date Started" value={project?.dateStarted ? new Date(project.dateStarted).toLocaleDateString() : 'N/A'} />
                    <ProfileItem label="Completion Date" value={project?.contractCompletionDate ? new Date(project.contractCompletionDate).toLocaleDateString() : 'N/A'} />
                    <ProfileItem label="Contract Cost (PHP)" value={`₱${formatNumberWithCommas(project?.contractCost)}`} />
                    <ProfileItem label="Contractor" value={project?.contractor || 'N/A'} />
                    <ProfileItem label="Project Engineer" value={project?.projectManager || 'N/A'} />
                    <ProfileItem label="Construction Consultant" value={project?.constructionConsultant || 'N/A'} />
                    <ProfileItem label="Implementing Office" value={project?.implementingOffice || 'N/A'} />
                    <ProfileItem label="Sources of Fund" value={project?.sourcesOfFund || 'N/A'} />
                </div>
            </div>

            {/* ✅ Tabs — live inside the project, not in sidebar */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm">
                {/* Tab Bar */}
                <div className="border-b border-gray-200 dark:border-slate-700 px-6 overflow-x-auto">
                    <nav className="flex space-x-2 min-w-max" aria-label="Project Tabs">
                        {['Milestones', 'Updates', 'Photos', 'Reports', 'Comments', 'Documents', 'Maps'].map(tab => (
                            <TabButton key={tab} label={tab} activeTab={activeTab} setActiveTab={setActiveTab} />
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {renderTabContent()}
                </div>
            </div>

        </Layout>
    );
}

export default ProjectDetailPage;