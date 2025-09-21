import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

// Helper function to get the token
const getToken = () => localStorage.getItem('token');

// Reusable component for a single project row
const ProjectRow = ({ project }) => (
    <Link to={`/project/${project.projectId}`} className="block hover:bg-gray-50 transition duration-300">
        <div className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
            
            {/* Main project image placeholder */}
            <div className="w-12 h-12 rounded-lg mr-4 bg-gray-200"></div>
            
            <div className="flex-1">
                <div className="font-bold">{project.name}</div>
            </div>
            
            {/* Placeholder sections for Task and Budget */}
            <div className="w-1/4 mx-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Task</span>
                    <span>90%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `90%` }}></div>
                </div>
            </div>
            <div className="w-1/4 mx-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Budget</span>
                    <span>${project.budget}m</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `100%` }}></div>
                </div>
            </div>
            <div className="w-48 text-center bg-stone-100 p-2 rounded-lg mx-4">
                Due to {new Date(project.createdAt).toLocaleDateString()}
            </div>
            
            {/* --- THIS IS THE CHANGE --- */}
            {/* The team member images have been removed and replaced with an empty div */}
            {/* to maintain spacing. You can also remove this div entirely if you prefer. */}
            <div className="w-20 h-8"></div>

        </div>
    </Link>
);

function DashboardPage() {
    // ... the rest of your component remains exactly the same
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
                            <p>No projects found. Create your first project on the 'Projects' page!</p>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default DashboardPage;