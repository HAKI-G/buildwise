import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';

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

// Reusable component for the key-value pairs in the project profile
const ProfileItem = ({ label, value }) => (
    <div>
        <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-medium text-gray-800 dark:text-white truncate">{value}</div>
    </div>
);

// Reusable component for the tab buttons
const TabButton = ({ label, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(label.toLowerCase())}
        className={`px-4 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors duration-200 ${
            activeTab === label.toLowerCase()
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-b-2 hover:border-gray-300 dark:hover:border-slate-600'
        }`}
    >
        {label}
    </button>
);

function ProjectDetailPage() {
    const { projectId } = useParams(); // ✅ Get projectId from URL
    const navigate = useNavigate();

    // --- State Management ---
    const [project, setProject] = useState(null);
    const [activeTab, setActiveTab] = useState('milestones');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // ✅ Debug: Log projectId to console
    useEffect(() => {
        console.log('🔍 ProjectDetailPage loaded');
        console.log('📁 projectId from URL:', projectId);
    }, [projectId]);

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
            // Fetch project data
            const projectRes = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
            setProject(projectRes.data);
            console.log('✅ Project data loaded:', projectRes.data);
            
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
    // ✅ CRITICAL: Pass projectId to ALL components
    const renderTabContent = () => {
        console.log('🎯 Rendering tab:', activeTab, 'with projectId:', projectId);
        
        switch(activeTab) {
            case 'milestones':
                return <Milestones projectId={projectId} />;
            case 'updates':
                return <Updates projectId={projectId} />;
            case 'photos':
                return <Photos projectId={projectId} />; // ✅ CRITICAL LINE
            case 'reports':
                return <Reports projectId={projectId} />;
            case 'comments':
                return <Comments projectId={projectId} />;
            case 'documents':
                return <Documents projectId={projectId} />;
            case 'maps': 
                return <Maps projectId={projectId} />;
            default:
                return <Milestones projectId={projectId} />;
        }
    };

    // --- Render Logic ---
    if (loading) return <Layout title="Loading..."><p className="text-center p-8 text-gray-500 dark:text-slate-400">Loading project details...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center text-red-500 dark:text-red-400 p-8">{error}</p></Layout>;

    return (
        <Layout title={project ? project.name : 'Project Details'}>
            
            {/* --- Project Profile Section --- */}
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-6 shadow-sm transition-colors">
                <ProfileItem label="Project Name" value={project?.name || 'N/A'} />
                <ProfileItem label="Location" value={project?.location || 'N/A'} />
                <ProfileItem label="Contractor" value={project?.contractor || 'N/A'} />
                <ProfileItem label="Date Started" value={project?.dateStarted ? new Date(project.dateStarted).toLocaleDateString() : 'N/A'} />
                <ProfileItem label="Completion Date" value={project?.contractCompletionDate ? new Date(project.contractCompletionDate).toLocaleDateString() : 'N/A'} />
                <ProfileItem label="Contract Cost (PHP)" value={`₱${project?.contractCost?.toLocaleString() || 'N/A'}`} />
                <ProfileItem label="Construction Consultant" value={project?.constructionConsultant || 'N/A'} />
                <ProfileItem label="Implementing Office" value={project?.implementingOffice || 'N/A'} />
                <ProfileItem label="Sources of Fund" value={project?.sourcesOfFund || 'N/A'} />
                <ProfileItem label="Project Manager" value={project?.projectManager || 'N/A'} />
            </div>

            {/* --- Interactive Tabs Section --- */}
            <div>
                <div className="border-b border-gray-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <TabButton label="Milestones" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Updates" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Photos" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Reports" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Comments" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Documents" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Maps" activeTab={activeTab} setActiveTab={setActiveTab} />
                    </nav>
                </div>

                <div className="py-6">
                    {renderTabContent()}
                </div>
            </div>
        </Layout>
    );
}

export default ProjectDetailPage;