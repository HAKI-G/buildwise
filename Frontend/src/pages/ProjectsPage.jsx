import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import ProjectActionButtons from '../components/ProjectActionButtons';
import { Upload, X, Plus, Search } from 'lucide-react';

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
    
    // ✅ Modal toggle state
    const [showModal, setShowModal] = useState(false);
    
    // ✅ Search state
    const [searchQuery, setSearchQuery] = useState('');

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

    // ✅ Helper function to format numbers with commas
    const formatNumberWithCommas = (value) => {
        if (!value) return '';
        const number = value.toString().replace(/\D/g, '');
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // ✅ Filter projects based on search query
    const filteredProjects = projects.filter((project) => {
        const query = searchQuery.toLowerCase();
        return (
            project.name?.toLowerCase().includes(query) ||
            project.location?.toLowerCase().includes(query)
        );
    });

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
            if (file.size > 5 * 1024 * 1024) {
                setError('Image size should not exceed 5MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            setProjectImage(file);
            
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
            const response = await axios.post('http://localhost:5001/api/projects', formData, config);
            
            setProjects(prev => [response.data.project, ...prev]);

            try {
                await axios.post('http://localhost:5001/api/notifications/send', {
                    type: 'PROJECT_CREATED',
                    title: 'New Project Created',
                    message: `${projectName} has been created`,
                    metadata: { projectId: response.data.project.projectId, projectName }
                }, config);
            } catch (notifErr) {
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
            
            // ✅ Close modal after successful creation
            setShowModal(false);
            
        } catch (err) {
            setError(err.response ? err.response.data.message : 'Failed to create project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
    <Layout title="Projects">
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Active Projects Section with Search and Button */}
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                {/* ✅ Header Row with Title, Search, and Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                        Active Projects ({filteredProjects.length})
                    </h2>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        {/* Compact Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            />
                        </div>
                        
                        {/* Add New Project Button */}
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New Project</span>
                        </button>
                    </div>
                </div>
                
                {/* Projects List */}
                <div className="max-h-[70vh] sm:max-h-[80vh] overflow-y-auto pr-1 sm:pr-2">
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map(project => (
                            <ProjectListItem 
                                key={project.projectId} 
                                project={project} 
                                onDelete={handleDelete} 
                            />
                        ))
                    ) : (
                        <div className="text-center py-8 sm:py-12">
                            <p className="text-sm sm:text-base text-gray-500 dark:text-slate-400">
                                {searchQuery ? `No projects found matching "${searchQuery}"` : 'No projects found. Add one to get started!'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>

            {/* ✅ Modal Overlay and Content */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-white">
                                Add a New Project
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            <form onSubmit={handleCreateProject} className="space-y-4">
                                
                                {/* ✅ Project Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Project Image
                                    </label>
                                    
                                    {!imagePreview ? (
                                        <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                                            <input
                                                type="file"
                                                id="projectImage"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                            <label htmlFor="projectImage" className="cursor-pointer flex flex-col items-center">
                                                <Upload className="w-10 h-10 text-slate-500 mb-2" />
                                                <span className="text-sm text-slate-400">
                                                    Click to upload project image
                                                </span>
                                                <span className="text-xs text-slate-500 mt-1">
                                                    PNG, JPG up to 5MB
                                                </span>
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img 
                                                src={imagePreview} 
                                                alt="Preview" 
                                                className="w-full h-48 object-cover rounded-lg border-2 border-slate-600"
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
                                    <label htmlFor="projectName" className="block text-sm font-medium text-slate-300 mb-1">
                                        Project Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        id="projectName" 
                                        value={projectName} 
                                        onChange={(e) => setProjectName(e.target.value)} 
                                        required 
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Location */}
                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium text-slate-300 mb-1">
                                        Location <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        id="location" 
                                        value={location} 
                                        onChange={(e) => setLocation(e.target.value)} 
                                        required 
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Contractor */}
                                <div>
                                    <label htmlFor="contractor" className="block text-sm font-medium text-slate-300 mb-1">
                                        Contractor
                                    </label>
                                    <input 
                                        type="text" 
                                        id="contractor" 
                                        value={contractor} 
                                        onChange={(e) => setContractor(e.target.value)} 
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="dateStarted" className="block text-sm font-medium text-slate-300 mb-1">
                                            Date Started
                                        </label>
                                        <input 
                                            type="date" 
                                            id="dateStarted" 
                                            value={dateStarted} 
                                            onChange={(e) => setDateStarted(e.target.value)} 
                                            className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="contractCompletionDate" className="block text-sm font-medium text-slate-300 mb-1">
                                            Completion Date
                                        </label>
                                        <input 
                                            type="date" 
                                            id="contractCompletionDate" 
                                            value={contractCompletionDate} 
                                            onChange={(e) => setContractCompletionDate(e.target.value)} 
                                            className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                                
                                {/* ✅ Contract Cost with Comma Formatting */}
                                <div>
                                    <label htmlFor="contractCost" className="block text-sm font-medium text-slate-300 mb-1">
                                        Contract Cost (PHP)
                                    </label>
                                    <input 
                                        type="text" 
                                        id="contractCost" 
                                        value={formatNumberWithCommas(contractCost)} 
                                        onChange={(e) => {
                                            const rawValue = e.target.value.replace(/,/g, '');
                                            setContractCost(rawValue);
                                        }} 
                                        placeholder="e.g., 100,000" 
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Consultant */}
                                <div>
                                    <label htmlFor="constructionConsultant" className="block text-sm font-medium text-slate-300 mb-1">
                                        Construction Consultant
                                    </label>
                                    <input 
                                        type="text" 
                                        id="constructionConsultant" 
                                        value={constructionConsultant} 
                                        onChange={(e) => setConstructionConsultant(e.target.value)} 
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Implementing Office */}
                                <div>
                                    <label htmlFor="implementingOffice" className="block text-sm font-medium text-slate-300 mb-1">
                                        Implementing Office
                                    </label>
                                    <input 
                                        type="text" 
                                        id="implementingOffice" 
                                        value={implementingOffice} 
                                        onChange={(e) => setImplementingOffice(e.target.value)}
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Sources of Fund */}
                                <div>
                                    <label htmlFor="sourcesOfFund" className="block text-sm font-medium text-slate-300 mb-1">
                                        Sources of Fund
                                    </label>
                                    <input 
                                        type="text" 
                                        id="sourcesOfFund" 
                                        value={sourcesOfFund} 
                                        onChange={(e) => setSourcesOfFund(e.target.value)} 
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Project Engineer */}
                                <div>
                                    <label htmlFor="projectManager" className="block text-sm font-medium text-slate-300 mb-1">
                                        Project Engineer
                                    </label>
                                    <input 
                                        type="text" 
                                        id="projectManager" 
                                        value={projectManager} 
                                        onChange={(e) => setProjectManager(e.target.value)} 
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="p-3 bg-red-900/20 border border-red-800 rounded-md">
                                        <p className="text-sm text-red-400 font-medium text-center">{error}</p>
                                    </div>
                                )}

                                {/* Modal Footer */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting} 
                                        className="px-6 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-300"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default ProjectsPage;
