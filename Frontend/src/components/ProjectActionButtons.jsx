import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotification } from '../context/NotificationContext';

const getToken = () => localStorage.getItem('token');

const ProjectActionButtons = ({ projectId, projectName, projectStatus, onProjectDeleted, showProgress = true, size = 'sm' }) => {
    const navigate = useNavigate();
    const notify = useNotification();

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
        // S5: Block deletion of completed projects
        if (projectStatus === 'Completed') {
            notify.warning('Cannot delete a completed project. Completed projects are archived and protected.');
            return;
        }

        notify.confirm(
            'Are you sure you want to delete this project? This action cannot be undone.',
            async () => {
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
                    await axios.delete(`${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/projects/${projectId}`, config);
                    
                    // ✅ Send notification
                    await axios.post(`${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/notifications/send`, {
                        type: 'PROJECT_DELETED',
                        title: 'Project Deleted',
                        message: `${projectName} has been deleted`,
                        metadata: { projectId, projectName }
                    }, config);
                    
                    notify.success('Project deleted successfully!');
                    
                    if (onProjectDeleted) {
                        onProjectDeleted(projectId);
                    }
                    
                } catch (error) {
                    console.error('Error deleting project:', error);
                    
                    if (error.response?.status === 401) {
                        notify.error('Session expired. Please login again.');
                        navigate('/login');
                    } else if (error.response?.status === 403) {
                        notify.error(error.response?.data?.message || 'You do not have permission to delete this project.');
                    } else if (error.response?.status === 404) {
                        notify.error('Project not found.');
                    } else {
                        notify.error('Failed to delete project. Please try again.');
                    }
                }
            },
            { title: 'Delete Project', confirmText: 'Delete', cancelText: 'Cancel' }
        );
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

    // S7: Check if user is VP (read-only access)
    const isVP = localStorage.getItem('userRole') === 'Vice President';

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
            
            {!isVP && (
            <button
                onClick={() => handleUpdateProject(projectId)}
                className={getButtonClass('gray')}
                title="Update Project"
            >
                Update Project
            </button>
            )}
            
            {!isVP && (
            <button
                onClick={() => handleDeleteProject(projectId)}
                className={projectStatus === 'Completed' ? `${getButtonClass('red')} opacity-50 cursor-not-allowed` : getButtonClass('red')}
                title={projectStatus === 'Completed' ? "Cannot delete a completed project" : "Delete Project"}
                disabled={projectStatus === 'Completed'}
            >
                Delete Project
            </button>
            )}
        </div>
    );
};

export default ProjectActionButtons;