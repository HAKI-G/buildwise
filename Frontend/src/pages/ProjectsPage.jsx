import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import ProjectActionButtons from '../components/ProjectActionButtons';
import { Upload, X } from 'lucide-react';

// Helper to get auth token
const getToken = () => localStorage.getItem('token');

// Project list item component with image
const ProjectListItem = ({ project, onDelete }) => (
    <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm mb-3 hover:shadow-md transition-shadow duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Project Image */}
            {project.projectImage && (
                <div className="flex-shrink-0">
                    <img 
                        src={project.projectImage} 
                        alt={project.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-200 dark:border-slate-600"
                    />
                </div>
            )}
            
            {/* Project Info */}
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-blue-800 dark:text-blue-400 truncate">
                    {project.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-0.5 truncate">
                    {project.location}
                </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex-shrink-0">
                <ProjectActionButtons 
                    projectId={project.projectId}
                    projectName={project.name}
                    onProjectDeleted={(deletedId) => onDelete(deletedId)}
                    size="xs"
                    showProgress={true}
                />
            </div>
        </div>
    </div>
);

function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [projectName, setProjectName] = useState('');
    const [location, setLocation] = useState('');
    const [contractor, setContractor] = useState('');
    const [dateStarted, setDateStarted] = useState('');
    const [contractCompletionDate, setContractCompletionDate] = useState('');
    const [contractCost, setContractCost] = useState('');
    const [constructionConsultant, setConstructionConsultant] = useState('');
    const [implementingOffice, setImplementingOffice] = useState('');
    const [sourcesOfFund, setSourcesOfFund] = useState('');
    const [projectManager, setProjectManager] = useState('');
    
    // ✅ Image upload states
    const [projectImage, setProjectImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const navigate = useNavigate();

    // Fetch projects
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

    // ✅ Handle image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should not exceed 5MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            setProjectImage(file);
            
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setError('');
        }
    };

    // ✅ Clear image selection
    const clearImage = () => {
        setProjectImage(null);
        setImagePreview(null);
    };

    // Handle project deletion
    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) {
            return;
        }

        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            await axios.delete(`http://localhost:5001/api/projects/${projectId}`, config);
            console.log('✅ Project deleted from database');
        } catch (err) {
            console.error('Delete error:', err);
            
            if (err.response?.status !== 404) {
                alert('Failed to delete: ' + (err.response?.data?.message || 'Unknown error'));
                return;
            }
            
            console.log('⚠️ Project already deleted from database');
        }

        setProjects(prevProjects => prevProjects.filter(p => p.projectId !== projectId));
        
        try {
            await axios.post('http://localhost:5001/api/notifications/send', {
                type: 'PROJECT_DELETED',
                title: 'Project Deleted',
                message: 'Project has been deleted',
                metadata: { projectId }
            }, config);
        } catch (notifErr) {
            console.warn('Notification failed:', notifErr);
        }
    };

    // Handle project creation
    const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const token = getToken();
    const config = { 
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        } 
    };

    const formData = new FormData();
    formData.append('name', projectName);
    formData.append('location', location);
    formData.append('contractor', contractor);
    formData.append('dateStarted', dateStarted);
    formData.append('contractCompletionDate', contractCompletionDate);
    formData.append('contractCost', contractCost);
    formData.append('constructionConsultant', constructionConsultant);
    formData.append('implementingOffice', implementingOffice);
    formData.append('sourcesOfFund', sourcesOfFund);
    formData.append('projectManager', projectManager);
    
    if (projectImage) {
        formData.append('projectImage', projectImage);
    }

    try {
        // Create project
        const response = await axios.post('http://localhost:5001/api/projects', formData, config);
        
        setProjects(prev => [response.data.project, ...prev]);

        // ✅ Try to send notification, but don't fail if it errors
        try {
            await axios.post('http://localhost:5001/api/notifications/send', {
                type: 'PROJECT_CREATED',
                title: 'New Project Created',
                message: `${projectName} has been created`,
                metadata: { projectId: response.data.project.projectId, projectName }
            }, config);
        } catch (notifErr) {
            // ✅ Just log the error, don't show it to user
            console.warn('⚠️ Notification failed (project still created):', notifErr.message);
        }

        // Clear form
        setProjectName(''); 
        setLocation(''); 
        setContractor(''); 
        setDateStarted('');
        setContractCompletionDate(''); 
        setContractCost(''); 
        setConstructionConsultant('');
        setImplementingOffice(''); 
        setSourcesOfFund('');
        setProjectManager('');
        clearImage();
        
    } catch (err) {
        setError(err.response ? err.response.data.message : 'Failed to create project.');
    } finally {
        setIsSubmitting(false);
    }
};

    return (
        <Layout title="Projects">
            <div className="flex flex-col xl:grid xl:grid-cols-5 gap-4 sm:gap-6">
                {/* Left Side - Projects List */}
                <div className="xl:col-span-3">
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4">
                            Active Projects ({projects.length})
                        </h2>
                        <div className="max-h-[70vh] sm:max-h-[80vh] overflow-y-auto pr-1 sm:pr-2">
                            {projects.length > 0 ? (
                                projects.map(project => (
                                    <ProjectListItem 
                                        key={project.projectId} 
                                        project={project} 
                                        onDelete={handleDelete} 
                                    />
                                ))
                            ) : (
                                <div className="text-center py-8 sm:py-12">
                                    <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400">
                                        No projects found. Add one to get started!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side - Add Project Form */}
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm sticky top-4 transition-colors">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6">
                            Add a New Project
                        </h2>
                        <form onSubmit={handleCreateProject} className="space-y-3 sm:space-y-4">
                            
                            {/* ✅ Project Image Upload */}
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Project Image
                                </label>
                                
                                {!imagePreview ? (
                                    <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
                                        <input
                                            type="file"
                                            id="projectImage"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        <label htmlFor="projectImage" className="cursor-pointer flex flex-col items-center">
                                            <Upload className="w-10 h-10 text-gray-400 dark:text-slate-500 mb-2" />
                                            <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                                                Click to upload project image
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                                                PNG, JPG up to 5MB
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-slate-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={clearImage}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Project Name */}
                            <div>
                                <label htmlFor="projectName" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Project Name
                                </label>
                                <input 
                                    type="text" 
                                    id="projectName" 
                                    value={projectName} 
                                    onChange={(e) => setProjectName(e.target.value)} 
                                    required 
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            {/* Location */}
                            <div>
                                <label htmlFor="location" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Location
                                </label>
                                <input 
                                    type="text" 
                                    id="location" 
                                    value={location} 
                                    onChange={(e) => setLocation(e.target.value)} 
                                    required 
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            {/* Contractor */}
                            <div>
                                <label htmlFor="contractor" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Contractor
                                </label>
                                <input 
                                    type="text" 
                                    id="contractor" 
                                    value={contractor} 
                                    onChange={(e) => setContractor(e.target.value)} 
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            {/* Dates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="dateStarted" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                        Date Started
                                    </label>
                                    <input 
                                        type="date" 
                                        id="dateStarted" 
                                        value={dateStarted} 
                                        onChange={(e) => setDateStarted(e.target.value)} 
                                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contractCompletionDate" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                        Completion Date
                                    </label>
                                    <input 
                                        type="date" 
                                        id="contractCompletionDate" 
                                        value={contractCompletionDate} 
                                        onChange={(e) => setContractCompletionDate(e.target.value)} 
                                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            
                            {/* Contract Cost */}
                            <div>
                                <label htmlFor="contractCost" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Contract Cost (PHP)
                                </label>
                                <input 
                                    type="number" 
                                    id="contractCost" 
                                    value={contractCost} 
                                    onChange={(e) => setContractCost(e.target.value)} 
                                    placeholder="e.g., 1000000" 
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            {/* Consultant */}
                            <div>
                                <label htmlFor="constructionConsultant" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Construction Consultant
                                </label>
                                <input 
                                    type="text" 
                                    id="constructionConsultant" 
                                    value={constructionConsultant} 
                                    onChange={(e) => setConstructionConsultant(e.target.value)} 
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            {/* Implementing Office */}
                            <div>
                                <label htmlFor="implementingOffice" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Implementing Office
                                </label>
                                <input 
                                    type="text" 
                                    id="implementingOffice" 
                                    value={implementingOffice} 
                                    onChange={(e) => setImplementingOffice(e.target.value)}
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            {/* Sources of Fund */}
                            <div>
                                <label htmlFor="sourcesOfFund" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Sources of Fund
                                </label>
                                <input 
                                    type="text" 
                                    id="sourcesOfFund" 
                                    value={sourcesOfFund} 
                                    onChange={(e) => setSourcesOfFund(e.target.value)} 
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            {/* Project Manager */}
                            <div>
                                <label htmlFor="projectManager" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Project Manager
                                </label>
                                <input 
                                    type="text" 
                                    id="projectManager" 
                                    value={projectManager} 
                                    onChange={(e) => setProjectManager(e.target.value)} 
                                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="w-full px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition duration-300"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium text-center">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default ProjectsPage;