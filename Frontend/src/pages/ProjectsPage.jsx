import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

// Helper function to get the token from localStorage
const getToken = () => localStorage.getItem('token');

// Component for a single project in the list, with all action links
const ProjectListItem = ({ project, onDelete }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4 flex items-center justify-between">
        <div className="flex-1">
            <h3 className="font-bold text-lg text-blue-800">{project.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{project.location}</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
            <Link to={`/statistics/${project.projectId}`} className="text-green-600 hover:underline">view progress</Link>
            <Link to={`/project/${project.projectId}`} className="text-blue-600 hover:underline">view details</Link>
            <Link to={`/project/edit/${project.projectId}`} className="text-gray-600 hover:underline">update</Link>
            <button onClick={() => onDelete(project.projectId)} className="text-red-600 hover:underline">delete</button>
        </div>
    </div>
);

function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for all the form fields
    const [projectName, setProjectName] = useState('');
    const [location, setLocation] = useState('');
    const [contractor, setContractor] = useState('');
    const [dateStarted, setDateStarted] = useState('');
    const [contractCompletionDate, setContractCompletionDate] = useState('');
    const [contractCost, setContractCost] = useState('');
    const [constructionConsultant, setConstructionConsultant] = useState('');
    const [implementingOffice, setImplementingOffice] = useState('');
    const [sourcesOfFund, setSourcesOfFund] = useState('');

    const navigate = useNavigate();

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

    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;
        const token = getToken();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`http://localhost:5001/api/projects/${projectId}`, config);
            setProjects(projects.filter(p => p.projectId !== projectId));
        } catch (err) {
            setError('Failed to delete project.');
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        const token = getToken();
        const newProjectData = { 
            name: projectName, 
            location, 
            contractor, 
            dateStarted, 
            contractCompletionDate, 
            contractCost: Number(contractCost), 
            constructionConsultant, 
            implementingOffice, 
            sourcesOfFund 
        };
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post('http://localhost:5001/api/projects', newProjectData, config);
            
            setProjects(prevProjects => [response.data.project, ...prevProjects]);
            
            // Clear the form
            setProjectName(''); 
            setLocation(''); 
            setContractor(''); 
            setDateStarted('');
            setContractCompletionDate(''); 
            setContractCost(''); 
            setConstructionConsultant('');
            setImplementingOffice(''); 
            setSourcesOfFund('');
        } catch (err) {
            setError(err.response ? err.response.data.message : 'Failed to create project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout title="BuildWise">
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-2/3">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            Active Projects ({projects.length})
                        </h2>
                        <div className="max-h-[80vh] overflow-y-auto pr-2">
                            {projects.length > 0 ? (
                                projects.map(project => (
                                    <ProjectListItem 
                                        key={project.projectId} 
                                        project={project} 
                                        onDelete={handleDelete} 
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500 p-4 text-center">
                                    No projects found. Add one to get started!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="w-full lg:w-1/3">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            Add a New Project
                        </h2>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Project Name</label>
                                <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                                <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="contractor" className="block text-sm font-medium text-gray-700">Contractor</label>
                                <input type="text" id="contractor" value={contractor} onChange={(e) => setContractor(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="dateStarted" className="block text-sm font-medium text-gray-700">Date Started</label>
                                <input type="date" id="dateStarted" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="contractCompletionDate" className="block text-sm font-medium text-gray-700">Contract Completion Date</label>
                                <input type="date" id="contractCompletionDate" value={contractCompletionDate} onChange={(e) => setContractCompletionDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="contractCost" className="block text-sm font-medium text-gray-700">Contract Cost (PHP)</label>
                                <input type="number" id="contractCost" value={contractCost} onChange={(e) => setContractCost(e.target.value)} placeholder="e.g., 1000000" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="constructionConsultant" className="block text-sm font-medium text-gray-700">Construction Consultant</label>
                                <input type="text" id="constructionConsultant" value={constructionConsultant} onChange={(e) => setConstructionConsultant(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="implementingOffice" className="block text-sm font-medium text-gray-700">Implementing Office</label>
                                <input type="text" id="implementingOffice" value={implementingOffice} onChange={(e) => setImplementingOffice(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div>
                                <label htmlFor="sourcesOfFund" className="block text-sm font-medium text-gray-700">Sources of Fund</label>
                                <input type="text" id="sourcesOfFund" value={sourcesOfFund} onChange={(e) => setSourcesOfFund(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition duration-300">
                                    {isSubmitting ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                        {error && <p className="mt-4 text-center text-red-600 font-semibold">{error}</p>}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default ProjectsPage;
