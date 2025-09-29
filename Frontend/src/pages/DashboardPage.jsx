import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';

const getToken = () => localStorage.getItem('token');

// Enhanced ProjectRow component with real progress data
const ProjectRow = ({ project, taskProgress, budgetProgress }) => (
    <Link 
      to="/statistics"  // Changed to just /statistics without projectId
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
            
            {/* Task Progress - Real Data */}
            <div className="w-1/4 mx-4 hidden md:block">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Task</span>
                    <span>{taskProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${taskProgress}%` }}
                    ></div>
                </div>
            </div>
            
            {/* Budget Progress - Real Data */}
            <div className="w-1/4 mx-4 hidden md:block">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>Budget</span>
                    <span>{project.contractCost ? `₱${(project.contractCost / 1000000).toFixed(1)}m` : 'N/A'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                            budgetProgress > 90 ? 'bg-red-500' : 
                            budgetProgress > 70 ? 'bg-yellow-500' : 
                            'bg-green-500'
                        }`}
                        style={{ width: `${budgetProgress}%` }}
                    ></div>
                </div>
            </div>
            
            {/* Due Date Display */}
            <div className="w-48 text-center bg-stone-100 p-2 rounded-lg mx-4 hidden lg:block">
                Due to {new Date(project.contractCompletionDate || project.createdAt).toLocaleDateString()}
            </div>
            
            {/* Status Indicator */}
            <div className="w-20 hidden sm:block">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    project.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                    {project.status || 'Not Started'}
                </span>
            </div>
        </div>
    </Link>
);

function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [projectsWithProgress, setProjectsWithProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProjectsWithProgress = async () => {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }
            
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                // Fetch all projects
                const projectsResponse = await axios.get('http://localhost:5001/api/projects', config);
                const projectsData = projectsResponse.data;
                setProjects(projectsData);
                
                // Fetch progress data for each project
                const projectsWithProgressData = await Promise.all(
                    projectsData.map(async (project) => {
                        try {
                            // Fetch milestones for task progress
                            const milestonesResponse = await axios.get(
                                `http://localhost:5001/api/milestones/project/${project.projectId}`, 
                                config
                            );
                            const milestones = milestonesResponse.data || [];
                            
                            // Calculate task progress based on completed milestones
                            const completedMilestones = milestones.filter(m => m.status === 'Completed').length;
                            const taskProgress = milestones.length > 0 
                                ? Math.round((completedMilestones / milestones.length) * 100) 
                                : 0;
                            
                            // Fetch expenses for budget progress
                            const expensesResponse = await axios.get(
                                `http://localhost:5001/api/expenses/project/${project.projectId}`, 
                                config
                            );
                            const expenses = expensesResponse.data || [];
                            
                            // Calculate budget progress
                            const totalSpent = expenses.reduce((sum, expense) => 
                                sum + (parseFloat(expense.amount) || 0), 0
                            );
                            const budgetProgress = project.contractCost > 0
                                ? Math.min(Math.round((totalSpent / project.contractCost) * 100), 100)
                                : 0;
                            
                            return {
                                ...project,
                                taskProgress,
                                budgetProgress
                            };
                        } catch (err) {
                            console.warn(`Could not fetch progress for project ${project.projectId}:`, err);
                            return {
                                ...project,
                                taskProgress: 0,
                                budgetProgress: 0
                            };
                        }
                    })
                );
                
                setProjectsWithProgress(projectsWithProgressData);
            } catch (err) {
                console.error('Error fetching projects:', err);
                setError('Failed to fetch projects. Your session may have expired.');
            } finally {
                setLoading(false);
            }
        };
        
        fetchProjectsWithProgress();
    }, [navigate]);

    // Calculate summary statistics
    const stats = {
        totalProjects: projects.length,
        totalBudget: projects.reduce((sum, p) => sum + (p.contractCost || 0), 0),
        avgCompletion: projectsWithProgress.length > 0
            ? Math.round(projectsWithProgress.reduce((sum, p) => sum + p.taskProgress, 0) / projectsWithProgress.length)
            : 0,
        activeProjects: projects.filter(p => p.status === 'In Progress').length
    };

    return (
        <Layout title="Dashboard">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.totalProjects}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Active Projects</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.activeProjects}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Total Budget</p>
                    <p className="text-2xl font-bold text-green-600">₱{(stats.totalBudget / 1000000).toFixed(1)}M</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Avg. Completion</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.avgCompletion}%</p>
                </div>
            </div>

            {/* Projects List */}
            <div>
                <p className="text-gray-500 font-semibold mb-4">ACTIVE PROJECTS {projects.length}</p>
                
                {loading && <p className="text-center py-8 text-gray-500">Loading projects...</p>}
                {error && <p className="text-center py-8 text-red-500">{error}</p>}
                
                {!loading && !error && (
                    <div>
                        {projectsWithProgress.length > 0 ? (
                            projectsWithProgress.map(project => (
                                <ProjectRow 
                                    key={project.projectId} 
                                    project={project}
                                    taskProgress={project.taskProgress}
                                    budgetProgress={project.budgetProgress}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                <p className="text-gray-500 mb-4">No projects found. Create one on the 'Projects' page!</p>
                                <button 
                                    onClick={() => navigate('/projects')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Your First Project
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default DashboardPage;