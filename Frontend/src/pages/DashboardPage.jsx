import React, { useState, useEffect } from 'react';// 1. All imports from react-router-dom are combined into one clean line
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

// Helper function to get the token from localStorage
const getToken = () => localStorage.getItem('token');

// This is the component for a single project row
const ProjectRow = ({ project }) => (
    // 2. An onClick handler is added here. When a user clicks, it saves the project's ID.
    <Link 
      to={`/statistics/${project.projectId}`} 
      onClick={() => localStorage.setItem('lastSelectedProjectId', project.projectId)}
      className="block hover:bg-gray-50 transition duration-300"
    >
        <div className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
            
            {/* Project Image Placeholder */}
            <div className="w-12 h-12 rounded-lg mr-4 bg-gray-200 flex-shrink-0"></div>
            
            {/* Project Name and Location */}
            <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{project.name}</p>
                <p className="text-sm text-gray-500 truncate">{project.location}</p>
            </div>
            
            {/* Placeholder for Task Progress */}
            <div className="w-1/4 mx-4 hidden md:block">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Task</span>
                    <span>90%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `90%` }}></div>
                </div>
            </div>
            
            {/* Budget Display */}
            <div className="w-1/4 mx-4 hidden md:block">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Budget</span>
                    <span>{project.contractCost ? `₱${(project.contractCost / 1000000).toFixed(1)}m` : 'N/A'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `100%` }}></div>
                </div>
            </div>
            
            {/* Due Date Display */}
            <div className="w-48 text-center bg-stone-100 p-2 rounded-lg mx-4 hidden lg:block">
                Due to {new Date(project.contractCompletionDate || project.createdAt).toLocaleDateString()}
            </div>
            
            {/* Team Placeholder */}
            <div className="w-20 h-8 hidden sm:block"></div>
        </div>
    </Link>
);


function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
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
                setError('Failed to fetch projects. Your session may have expired.');
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [navigate]);

    return (
        <Layout title="Dashboard">
            <div>
                <p className="text-gray-500 font-semibold mb-4">ACTIVE PROJECTS {projects.length}</p>
                
                {loading && <p>Loading projects...</p>}
                {error && <p className="text-red-500">{error}</p>}
                
                {!loading && !error && (
                    <div>
                        {projects.length > 0 ? (
                            projects.map(project => <ProjectRow key={project.projectId} project={project} />)
                        ) : (
                            <p>No projects found. Create one on the 'Projects' page!</p>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default DashboardPage;