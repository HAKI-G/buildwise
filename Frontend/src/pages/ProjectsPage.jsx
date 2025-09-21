import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

// Helper function to get the token
const getToken = () => localStorage.getItem('token');

// The component for each project in the list now only has a Delete button
const ProjectListItem = ({ project, onDelete }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <Link to={`/project/${project.projectId}`} className="flex-1 hover:underline">
            <div>
                <h3 className="font-bold text-lg text-blue-700">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.location}</p>
            </div>
        </Link>
        <div className="flex items-center">
            <button 
                onClick={() => onDelete(project.projectId)}
                className="text-sm font-semibold text-red-600 hover:text-red-800"
            >
                Delete
            </button>
        </div>
    </div>
);


function ProjectsPage() {
    // State for the list of projects
    const [projects, setProjects] = useState([]);
    
    // State for the form inputs
    const [projectName, setProjectName] = useState('');
    const [location, setLocation] = useState('');
    const [budget, setBudget] = useState('');
    
    // State for handling submission and errors
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigate = useNavigate();

    // Fetch all projects when the component loads
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

    // Function to handle deleting a project
    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) {
            return;
        }

        const token = getToken();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`http://localhost:5001/api/projects/${projectId}`, config);

            // Instantly update the UI by removing the deleted project from the list
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
        const newProjectData = { name: projectName, location, budget: Number(budget) };

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post('http://localhost:5001/api/projects', newProjectData, config);

            // Add the new project to the list for a real-time update
            setProjects([response.data.project, ...projects]);
            
            // Clear the form
            setProjectName('');
            setLocation('');
            setBudget('');

        } catch (err) {
            const message = err.response ? err.response.data.message : 'Failed to create project.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout title="Projects">
            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* --- Left Column: Project List --- */}
                <div className="w-full lg:w-2/3">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Projects ({projects.length})</h2>
                        <div className="max-h-[600px] overflow-y-auto">
                            {projects.length > 0 ? (
                                projects.map(project => 
                                    <ProjectListItem 
                                        key={project.projectId} 
                                        project={project} 
                                        onDelete={handleDelete} 
                                    />
                                )
                            ) : (
                                <p className="text-gray-500 p-4">No projects found. Add one to get started!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Create Project Form --- */}
                <div className="w-full lg:w-1/3">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Add a New Project</h2>
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            {/* Form inputs remain the same */}
                            <div>
                                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700">Project Name</label>
                                <input type="text" id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                                <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                             <div>
                                <label htmlFor="budget" className="block text-sm font-medium text-gray-700">Budget (in millions)</label>
                                <input type="number" id="budget" value={budget} onChange={(e) => setBudget(e.target.value)} required placeholder="e.g., 100" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
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