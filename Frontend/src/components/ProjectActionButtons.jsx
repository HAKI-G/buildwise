import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const getToken = () => localStorage.getItem('token');

const ProjectActionButtons = ({ projectId, projectName, onProjectDeleted, showProgress = true, size = 'sm' }) => {
    const navigate = useNavigate();

    const handleViewProgress = (projectId) => {
        navigate(`/statistics/${projectId}`);
    };

    const handleViewDetails = (projectId) => {
        navigate(`/projects/${projectId}`);
    };

    const handleUpdateProject = (projectId) => {
        navigate(`/projects/edit/${projectId}`);
    };

    const handleDeleteProject = async (projectId) => {
        const isConfirmed = window.confirm(
            'Are you sure you want to delete this project? This action cannot be undone.'
        );
        
        if (!isConfirmed) return;

        try {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            const config = { 
                headers: { Authorization: `Bearer ${token}` } 
            };

            // Delete project (backend creates audit log automatically)
            await axios.delete(`http://localhost:5001/api/projects/${projectId}`, config);
            
            // ✅ Send notification
            await axios.post('http://localhost:5001/api/notifications/send', {
                type: 'PROJECT_DELETED',
                title: 'Project Deleted',
                message: `${projectName} has been deleted`,
                metadata: { projectId, projectName }
            }, config);
            
            alert('Project deleted successfully!');
            
            if (onProjectDeleted) {
                onProjectDeleted(projectId);
            }
            
        } catch (error) {
            console.error('Error deleting project:', error);
            
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
                navigate('/login');
            } else if (error.response?.status === 403) {
                alert('You do not have permission to delete this project.');
            } else if (error.response?.status === 404) {
                alert('Project not found.');
            } else {
                alert('Failed to delete project. Please try again.');
            }
        }
    };

    // Dynamic button classes based on size
    const getButtonClass = (color) => {
        const baseClass = `font-medium hover:underline focus:outline-none transition-colors duration-200`;
        const sizeClass = size === 'xs' ? 'text-xs px-1 py-0.5' : 'text-xs sm:text-sm px-1 py-0.5';
        const colorClass = {
            green: 'text-green-600 hover:text-green-800',
            blue: 'text-blue-600 hover:text-blue-800', 
            gray: 'text-gray-600 hover:text-gray-800',
            red: 'text-red-600 hover:text-red-800'
        };
        
        return `${baseClass} ${sizeClass} ${colorClass[color]}`;
    };

    return (
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {showProgress && (
                <button
                    onClick={() => handleViewProgress(projectId)}
                    className={getButtonClass('green')}
                    title="View Progress"
                >
                    View Progress
                </button>
            )}
            
            <button
                onClick={() => handleViewDetails(projectId)}
                className={getButtonClass('blue')}
                title="View Details"
            >
                View Details
            </button>
            
            <button
                onClick={() => handleUpdateProject(projectId)}
                className={getButtonClass('gray')}
                title="Update Project"
            >
                Update Project
            </button>
            
            <button
                onClick={() => handleDeleteProject(projectId)}
                className={getButtonClass('red')}
                title="Delete Project"
            >
                Delete Project
            </button>
        </div>
    );
};

export default ProjectActionButtons;