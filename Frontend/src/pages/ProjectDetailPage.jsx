import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout'; // Using your Layout component for consistency

// A small, reusable component for the key-value pairs in the project profile
const ProfileItem = ({ label, value }) => (
    <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-medium text-gray-800 truncate">{value}</div>
    </div>
);

// A small, reusable component for the tab buttons
const TabButton = ({ label, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(label.toLowerCase())}
        className={`px-4 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors duration-200 ${
            activeTab === label.toLowerCase()
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
        }`}
    >
        {label}
    </button>
);

function ProjectDetailPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [updates, setUpdates] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [activeTab, setActiveTab] = useState('milestones');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjectDetails = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            try {
                // Fetch all data in parallel for better performance
                const [projectRes, milestonesRes /*, updatesRes, photosRes, docsRes */] = await Promise.all([
                    axios.get(`http://localhost:5001/api/projects/${projectId}`, config),
                    axios.get(`http://localhost:5001/api/milestones/${projectId}`, config),
                    // NOTE: You will need to create and add the API calls for these other data types
                    // axios.get(`http://localhost:5001/api/updates/project/${projectId}`, config),
                    // axios.get(`http://localhost:5001/api/photos/project/${projectId}`, config),
                    // axios.get(`http://localhost:5001/api/documents/${projectId}`, config),
                ]);
                
                setProject(projectRes.data);
                setMilestones(milestonesRes.data);
                // setUpdates(updatesRes.data);
                // setPhotos(photosRes.data);
                // setDocuments(docsRes.data);
                
            } catch (err) {
                setError('Failed to fetch project details.');
            } finally {
                setLoading(false);
            }
        };
        fetchProjectDetails();
    }, [projectId, navigate]);

    if (loading) return <Layout title="Loading..."><p className="text-center p-8">Loading project details...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center text-red-500 p-8">{error}</p></Layout>;

    return (
        <Layout title={project ? project.name : 'Project Details'}>
            
            {/* --- Project Profile Section --- */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6 shadow-sm">
                <ProfileItem label="Contractor" value={project?.contractor || 'N/A'} />
                <ProfileItem label="Date Started" value={project?.dateStarted ? new Date(project.dateStarted).toLocaleDateString() : 'N/A'} />
                <ProfileItem label="Completion Date" value={project?.contractCompletionDate ? new Date(project.contractCompletionDate).toLocaleDateString() : 'N/A'} />
                <ProfileItem label="Contract Cost (PHP)" value={`₱${project?.contractCost?.toLocaleString() || 'N/A'}`} />
                <ProfileItem label="Construction Consultant" value={project?.constructionConsultant || 'N/A'} />
                <ProfileItem label="Implementing Office" value={project?.implementingOffice || 'N/A'} />
                <ProfileItem label="Sources of Fund" value={project?.sourcesOfFund || 'N/A'} />
                <ProfileItem label="Project Manager" value="Juan dela Cruz" /> {/* Placeholder */}
            </div>

            {/* --- Interactive Tabs Section --- */}
            <div>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <TabButton label="Milestones" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Updates" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Photos" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Documents" activeTab={activeTab} setActiveTab={setActiveTab} />
                    </nav>
                </div>

                <div className="py-6">
                    {activeTab === 'milestones' && (
                        <div className="space-y-4">
                            {milestones.length > 0 ? (
                                milestones.map(m => (
                                    <div key={m.milestoneId} className="bg-white p-4 rounded-lg border shadow-sm">
                                        <h3 className="font-bold text-gray-800">{m.milestoneName} <span className="text-sm font-medium text-gray-500">({m.status})</span></h3>
                                        <p className="text-gray-600 mt-1">{m.description}</p>
                                    </div>
                                ))
                            ) : (<p className="text-center text-gray-500 py-8">No milestones for this project yet.</p>)}
                        </div>
                    )}
                    {activeTab === 'updates' && ( <div className="text-center text-gray-500 py-8"><p>Progress Updates will be shown here.</p></div> )}
                    {activeTab === 'photos' && ( <div className="text-center text-gray-500 py-8"><p>Photo Gallery will be shown here.</p></div> )}
                    {activeTab === 'documents' && ( <div className="text-center text-gray-500 py-8"><p>Project Documents will be shown here.</p></div> )}
                </div>
            </div>
        </Layout>
    );
}

export default ProjectDetailPage;

