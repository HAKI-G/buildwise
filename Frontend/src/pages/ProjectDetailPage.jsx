import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';
import { useNotification } from '../context/NotificationContext';

// Import the separate tab components
import Milestones from '../components/Milestones.jsx';
import Updates from '../components/Updates.jsx';
import Photos from '../components/Photos.jsx';
import Comments from '../components/Comments.jsx';
import Documents from '../components/Documents.jsx';
import Maps from '../components/Maps.jsx';
import Reports from '../components/Reports.jsx';

// Helper to get token
const getToken = () => localStorage.getItem('token');

// ✅ Custom ProfileItem component with styled Tailwind tooltip
const ProfileItem = ({ label, value }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div 
            className="group relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {label}
            </div>
            <div className="text-lg font-medium text-gray-800 dark:text-white truncate">
                {value}
            </div>
            
            {/* ✅ Custom Tailwind Tooltip - appears above the field */}
            <div className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-slate-700 rounded-lg shadow-xl border border-gray-700 dark:border-slate-600 whitespace-nowrap pointer-events-none transition-all duration-200 ${
                showTooltip && value && value !== 'N/A' ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}>
                {value}
                {/* Tooltip Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="border-[6px] border-transparent border-t-gray-900 dark:border-t-slate-700"></div>
                </div>
            </div>
        </div>
    );
};

// Reusable component for the tab buttons
const TabButton = ({ label, activeTab, setActiveTab, projectId }) => {
    const navigate = useNavigate();
    const tabName = label.toLowerCase();
    
    const handleClick = () => {
        setActiveTab(tabName);
        navigate(`/projects/${projectId}/${tabName}`);
    };
    
    return (
        <button
            onClick={handleClick}
            className={`px-4 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors duration-200 ${
                activeTab === tabName
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-b-2 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
        >
            {label}
        </button>
    );
};

function ProjectDetailPage() {
    const { projectId, tab } = useParams(); // ✅ FIXED: Read tab from URL
    const navigate = useNavigate();
    const notify = useNotification();

    // --- State Management ---
    const [project, setProject] = useState(null);
    const [activeTab, setActiveTab] = useState(tab || 'milestones'); // ✅ FIXED: Initialize from URL param
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ✅ FIXED: Update active tab when URL changes
    useEffect(() => {
        if (tab) {
            setActiveTab(tab);
        } else {
            // If no tab in URL, default to milestones and update URL
            navigate(`/projects/${projectId}/milestones`, { replace: true });
        }
    }, [tab, projectId, navigate]);

    // ✅ Helper function to format numbers with commas
    const formatNumberWithCommas = (value) => {
        if (!value) return 'N/A';
        const number = value.toString().replace(/\D/g, '');
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // ✅ Debug: Log projectId to console
    useEffect(() => {
        console.log('🔍 ProjectDetailPage loaded');
        console.log('📁 projectId from URL:', projectId);
        console.log('📑 tab from URL:', tab);
    }, [projectId, tab]);

    // --- Data Fetching ---
    const fetchProjectData = useCallback(async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };

        setLoading(true);
        try {
            const projectRes = await axios.get(`${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/projects/${projectId}`, config);
            setProject(projectRes.data);
            console.log('✅ Project data loaded:', projectRes.data);
            
            // ✅ Store last selected project ID
            localStorage.setItem('lastSelectedProjectId', projectId);
            
        } catch (err) {
            if (err.response && err.response.status === 401) {
                navigate('/login');
            } else {
                setError('Failed to fetch project details.');
            }
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, [projectId, navigate]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    // --- Render Tab Content ---
    const renderTabContent = () => {
        console.log('🎯 Rendering tab:', activeTab, 'with projectId:', projectId);
        
        // ✅ Determine if project is read-only (Completed and user is not Admin)
        const isReadonly = project && (project.status === 'Completed' || localStorage.getItem('userRole') === 'Vice President') && localStorage.getItem('userRole') !== 'Admin';
        
        switch(activeTab) {
            case 'milestones':
                return <Milestones projectId={projectId} readonly={isReadonly} />;
            case 'updates':
                return <Updates projectId={projectId} readonly={isReadonly} />;
            case 'photos':
                return <Photos projectId={projectId} readonly={isReadonly} />;
            case 'reports':
                return <Reports projectId={projectId} />;
            case 'comments':
                return <Comments projectId={projectId} readonly={isReadonly} />;
            case 'documents':
                return <Documents projectId={projectId} readonly={isReadonly} />;
            case 'maps': 
                return <Maps projectId={projectId} />;
            default:
                return <Milestones projectId={projectId} readonly={isReadonly} />;
        }
    };
    
const [projectStatus, setProjectStatus] = useState('Not Started');
const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

// Load current status
useEffect(() => {
    if (project) {
        setProjectStatus(project.status || 'Not Started');
    }
}, [project]);

// Handle status change
const handleStatusChange = async (newStatus) => {
    if (!project) return;
    
    // Confirm for critical status changes
    if (newStatus === 'Completed') {
        notify.confirm(
            'Are you sure you want to mark this project as COMPLETED? This should only be done after final VP approval.',
            async () => {
                await executeStatusChange(newStatus);
            },
            { title: 'Confirm Completion', confirmText: 'Mark Completed', cancelText: 'Cancel' }
        );
        return;
    }
    
    await executeStatusChange(newStatus);
};

const executeStatusChange = async (newStatus) => {
    setIsUpdatingStatus(true);
    
    try {
        await axios.patch(
            `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/projects/${project.projectId}/status`,
            { status: newStatus },
            { headers: getAuthHeaders() }
        );
        
        setProjectStatus(newStatus);
        notify.success(`Project status updated to: ${newStatus}`);
        
        // Refresh project data
        fetchProject();
        
    } catch (error) {
        console.error('Error updating status:', error);
        notify.error('Failed to update project status');
    } finally {
        setIsUpdatingStatus(false);
    }
};

// Status dropdown JSX
<div className="relative">
    <select
        value={projectStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdatingStatus}
        className={`px-4 py-2 rounded-lg font-medium text-white border-2 cursor-pointer
            ${projectStatus === 'Not Started' ? 'bg-gray-500 border-gray-600' : ''}
            ${projectStatus === 'In Progress' ? 'bg-blue-600 border-blue-700' : ''}
            ${projectStatus === 'On Hold' ? 'bg-yellow-600 border-yellow-700' : ''}
            ${projectStatus === 'Overdue' ? 'bg-red-600 border-red-700' : ''}
            ${projectStatus === 'Completed' ? 'bg-green-600 border-green-700' : ''}
            ${isUpdatingStatus ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}
        `}
    >
        <option value="Not Started">Not Started</option>
        <option value="In Progress">In Progress</option>
        <option value="On Hold">On Hold</option>
        <option value="Overdue">Overdue</option>
        <option value="Completed">Completed</option>
    </select>
    
    {/* Status Helper Text */}
    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
        {projectStatus === 'Not Started' && 'Project created, no activity yet'}
        {projectStatus === 'In Progress' && 'Work is ongoing'}
        {projectStatus === 'On Hold' && 'Paused for review/approval'}
        {projectStatus === 'Overdue' && 'Past due date or requirements not met'}
        {projectStatus === 'Completed' && 'Project finished and approved'}
    </p>
</div>


    // --- Render Logic ---
    if (loading) return <Layout title="Loading..."><p className="text-center p-8 text-gray-500 dark:text-slate-400">Loading project details...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center text-red-500 dark:text-red-400 p-8">{error}</p></Layout>;

    return (
        <Layout title={project ? project.name : 'Project Details'}>
            
            {/* --- Project Profile Section --- */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 sm:p-6 mb-4 sm:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-4 sm:gap-y-6 shadow-sm transition-colors">
                <ProfileItem label="Project Name" value={project?.name || 'N/A'} />
                <ProfileItem label="Location" value={project?.location || 'N/A'} />
                <ProfileItem label="Contractor" value={project?.contractor || 'N/A'} />
                <ProfileItem label="Date Started" value={project?.dateStarted ? new Date(project.dateStarted).toLocaleDateString() : 'N/A'} />
                <ProfileItem label="Completion Date" value={project?.contractCompletionDate ? new Date(project.contractCompletionDate).toLocaleDateString() : 'N/A'} />
                {/* ✅ Updated Contract Cost with comma formatting */}
                <ProfileItem label="Contract Cost (PHP)" value={`₱${formatNumberWithCommas(project?.contractCost)}`} />
                <ProfileItem label="Construction Consultant" value={project?.constructionConsultant || 'N/A'} />
                <ProfileItem label="Implementing Office" value={project?.implementingOffice || 'N/A'} />
                <ProfileItem label="Sources of Fund" value={project?.sourcesOfFund || 'N/A'} />
                <ProfileItem label="Project Engineer" value={project?.projectManager || 'N/A'} />
            </div>

            {/* --- Interactive Tabs Section --- */}
            <div>
                <div className="border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
                    <nav className="-mb-px flex space-x-2 sm:space-x-6 min-w-max" aria-label="Tabs">
                        <TabButton label="Milestones" activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} />
                        <TabButton label="Updates" activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} />
                        <TabButton label="Photos" activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} />
                        <TabButton label="Reports" activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} />
                        <TabButton label="Comments" activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} />
                        <TabButton label="Documents" activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} />
                        <TabButton label="Maps" activeTab={activeTab} setActiveTab={setActiveTab} projectId={projectId} />
                    </nav>
                </div>

                <div className="py-4 sm:py-6">
                    {renderTabContent()}
                </div>
            </div>
        </Layout>
    );
}

export default ProjectDetailPage;