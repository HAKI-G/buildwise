import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import { Upload, X, Plus, Search, Trash2 } from 'lucide-react';

const getToken = () => localStorage.getItem('token');

// ✅ Box-type project card
const ProjectListItem = ({ project, onDelete }) => {
    const navigate = useNavigate();

    const handleCardClick = () => {
        navigate(`/projects/${project.projectId}/milestones`);
    };

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        onDelete(project.projectId);
    };

    const statusColors = {
        'Completed':   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        'On Hold':     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        'Overdue':     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        'Not Started': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    };

    return (
        <div
            onClick={handleCardClick}
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group overflow-hidden flex flex-col"
        >
            {/* Cover Image */}
            <div className="w-full h-40 bg-gray-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                {project.projectImage ? (
                    <img
                        src={project.projectImage}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300 dark:text-slate-600">
                        🏗️
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="p-4 flex flex-col flex-1">
                {/* Status + Delete row */}
                <div className="flex items-center justify-between mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[project.status] || statusColors['Not Started']}`}>
                        {project.status || 'Not Started'}
                    </span>
                    <button
                        onClick={handleDeleteClick}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete project"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Project Name */}
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm leading-snug mb-1 line-clamp-2">
                    {project.name}
                </h3>

                {/* Location */}
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-auto pt-2 border-t border-gray-100 dark:border-slate-700">
                    📍 {project.location || 'No location set'}
                </p>
            </div>
        </div>
    );
};

function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
    const [projectImage, setProjectImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const navigate = useNavigate();

    const formatNumberWithCommas = (value) => {
        if (!value) return '';
        const number = value.toString().replace(/\D/g, '');
        return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const filteredProjects = projects.filter((project) => {
        const query = searchQuery.toLowerCase();
        return (
            project.name?.toLowerCase().includes(query) ||
            project.location?.toLowerCase().includes(query)
        );
    });

    useEffect(() => {
        const fetchProjects = async () => {
            const token = getToken();
            if (!token) { navigate('/login'); return; }
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get('/projects', config);
                setProjects(response.data);
            } catch (err) {
                setError('Could not fetch projects.');
            }
        };
        fetchProjects();
    }, [navigate]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { setError('Image size should not exceed 5MB'); return; }
            if (!file.type.startsWith('image/')) { setError('Please select a valid image file'); return; }
            setProjectImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
            setError('');
        }
    };

    const clearImage = () => { setProjectImage(null); setImagePreview(null); };

    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;
        const token = getToken();
        if (!token) { navigate('/login'); return; }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        try {
            await axios.delete(`/projects/${projectId}`, config);
        } catch (err) {
            if (err.response?.status !== 404) {
                alert('Failed to delete: ' + (err.response?.data?.message || 'Unknown error'));
                return;
            }
        }
        setProjects(prev => prev.filter(p => p.projectId !== projectId));
        try {
            await axios.post('/notifications/send', {
                type: 'PROJECT_DELETED', title: 'Project Deleted',
                message: 'Project has been deleted', metadata: { projectId }
            }, config);
        } catch (notifErr) { console.warn('Notification failed:', notifErr); }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } };
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
        if (projectImage) formData.append('projectImage', projectImage);

        try {
            const response = await axios.post('/projects', formData, config);
            setProjects(prev => [response.data.project, ...prev]);
            try {
                await axios.post('/notifications/send', {
                    type: 'PROJECT_CREATED', title: 'New Project Created',
                    message: `${projectName} has been created`,
                    metadata: { projectId: response.data.project.projectId, projectName }
                }, config);
            } catch (notifErr) { console.warn('Notification failed:', notifErr.message); }

            setProjectName(''); setLocation(''); setContractor(''); setDateStarted('');
            setContractCompletionDate(''); setContractCost(''); setConstructionConsultant('');
            setImplementingOffice(''); setSourcesOfFund(''); setProjectManager('');
            clearImage();
            setShowModal(false);
        } catch (err) {
            setError(err.response ? err.response.data.message : 'Failed to create project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout title="Projects">
            <div className="flex flex-col gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">

                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                            Active Projects ({filteredProjects.length})
                        </h2>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search projects..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 text-sm whitespace-nowrap transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add New Project
                            </button>
                        </div>
                    </div>

                    {/* Project Grid */}
                    <div className="overflow-y-auto max-h-[75vh] pr-1">
                        {filteredProjects.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredProjects.map(project => (
                                    <ProjectListItem key={project.projectId} project={project} onDelete={handleDelete} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-4xl mb-3">🏗️</p>
                                <p className="text-gray-500 dark:text-slate-400">
                                    {searchQuery ? `No projects found matching "${searchQuery}"` : 'No projects yet. Add one to get started!'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Project Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
                        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add a New Project</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleCreateProject} className="space-y-4">
                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Project Image</label>
                                    {!imagePreview ? (
                                        <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50 dark:bg-slate-900/20">
                                            <input type="file" id="projectImage" accept="image/*" onChange={handleImageChange} className="hidden" />
                                            <label htmlFor="projectImage" className="cursor-pointer flex flex-col items-center">
                                                <Upload className="w-10 h-10 text-gray-400 mb-2" />
                                                <span className="text-sm text-gray-600 dark:text-slate-400">Click to upload project image</span>
                                                <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border-2 border-gray-300 dark:border-slate-600" />
                                            <button type="button" onClick={clearImage} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Form Fields */}
                                {[
                                    { id: 'projectName', label: 'Project Name', value: projectName, setter: setProjectName, required: true },
                                    { id: 'location', label: 'Location', value: location, setter: setLocation, required: true },
                                    { id: 'contractor', label: 'Contractor', value: contractor, setter: setContractor },
                                    { id: 'constructionConsultant', label: 'Construction Consultant', value: constructionConsultant, setter: setConstructionConsultant },
                                    { id: 'implementingOffice', label: 'Implementing Office', value: implementingOffice, setter: setImplementingOffice },
                                    { id: 'sourcesOfFund', label: 'Sources of Fund', value: sourcesOfFund, setter: setSourcesOfFund },
                                    { id: 'projectManager', label: 'Project Engineer', value: projectManager, setter: setProjectManager },
                                ].map(field => (
                                    <div key={field.id}>
                                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <input type="text" id={field.id} value={field.value}
                                            onChange={(e) => field.setter(e.target.value)}
                                            required={field.required}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                ))}

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'dateStarted', label: 'Date Started', value: dateStarted, setter: setDateStarted },
                                        { id: 'contractCompletionDate', label: 'Completion Date', value: contractCompletionDate, setter: setContractCompletionDate },
                                    ].map(field => (
                                        <div key={field.id}>
                                            <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{field.label}</label>
                                            <input type="date" id={field.id} value={field.value}
                                                onChange={(e) => field.setter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                        </div>
                                    ))}
                                </div>

                                {/* Contract Cost */}
                                <div>
                                    <label htmlFor="contractCost" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Contract Cost (PHP)</label>
                                    <input type="text" id="contractCost"
                                        value={formatNumberWithCommas(contractCost)}
                                        onChange={(e) => setContractCost(e.target.value.replace(/,/g, ''))}
                                        placeholder="e.g., 100,000"
                                        className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                        <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">{error}</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                                    <button type="button" onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="px-6 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">
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