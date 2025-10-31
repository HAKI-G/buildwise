import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';
import auditService from '../services/auditService'; // ✅ ADD THIS IMPORT

// Helper to get token
const getToken = () => localStorage.getItem('token');

function UpdateProjectPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    // State for the main project form
    const [formData, setFormData] = useState({ 
        name: '', 
        location: '', 
        contractor: '',
        // Add all other project fields here to make them editable
    });
    
    // ✅ ADD THIS: Store original project data for comparison
    const [originalData, setOriginalData] = useState(null);
    
    // General state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        setLoading(true);
        try {
            const projectRes = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
            setFormData(projectRes.data);
            setOriginalData(projectRes.data); // ✅ ADD THIS: Store original data
            setError('');

        } catch (err) {
            if (err.response && err.response.status === 401) {
                localStorage.removeItem('token');
                navigate('/login');
            } else {
                setError('Failed to fetch project data.');
            }
        } finally {
            setLoading(false);
        }
    }, [projectId, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Event Handlers ---
    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // Update the project
            await axios.put(`http://localhost:5001/api/projects/${projectId}`, formData, config);
            
            // ✅ ADD THIS: Log the project update
            await auditService.logProjectUpdated(
                projectId,
                formData.name,
                {
                    // Old values
                    name: originalData.name,
                    location: originalData.location,
                    contractor: originalData.contractor,
                    dateStarted: originalData.dateStarted,
                    contractCompletionDate: originalData.contractCompletionDate,
                    contractCost: originalData.contractCost,
                    constructionConsultant: originalData.constructionConsultant,
                    implementingOffice: originalData.implementingOffice,
                    sourcesOfFund: originalData.sourcesOfFund,
                    projectManager: originalData.projectManager,
                },
                {
                    // New values
                    name: formData.name,
                    location: formData.location,
                    contractor: formData.contractor,
                    dateStarted: formData.dateStarted,
                    contractCompletionDate: formData.contractCompletionDate,
                    contractCost: formData.contractCost,
                    constructionConsultant: formData.constructionConsultant,
                    implementingOffice: formData.implementingOffice,
                    sourcesOfFund: formData.sourcesOfFund,
                    projectManager: formData.projectManager,
                }
            );
            
            navigate(`/project/${projectId}`); // Go back to details page on success
        } catch (err) {
             setError('Failed to update project. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---
    if (loading) return <Layout title="Loading..."><p className="text-center p-8">Loading...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center text-red-500 p-8">{error}</p></Layout>;

    return (
        <Layout title={`Update: ${formData.name}`}>
            {/* --- Update Project Details Form --- */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-md mb-8">
                <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Update Project Information</h1>
                <form onSubmit={handleUpdateProject}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Project Name</label>
                            <input 
                                type="text" 
                                name="name" 
                                id="name" 
                                value={formData.name || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Location</label>
                            <input 
                                type="text" 
                                name="location" 
                                id="location" 
                                value={formData.location || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        <div>
                            <label htmlFor="contractor" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Contractor</label>
                            <input 
                                type="text" 
                                name="contractor" 
                                id="contractor" 
                                value={formData.contractor || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        
                        {/* ✅ ADD MORE FIELDS HERE FOR COMPLETE EDITING */}
                        <div>
                            <label htmlFor="dateStarted" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Date Started</label>
                            <input 
                                type="date" 
                                name="dateStarted" 
                                id="dateStarted" 
                                value={formData.dateStarted ? formData.dateStarted.split('T')[0] : ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="contractCompletionDate" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Completion Date</label>
                            <input 
                                type="date" 
                                name="contractCompletionDate" 
                                id="contractCompletionDate" 
                                value={formData.contractCompletionDate ? formData.contractCompletionDate.split('T')[0] : ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="contractCost" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Contract Cost (PHP)</label>
                            <input 
                                type="number" 
                                name="contractCost" 
                                id="contractCost" 
                                value={formData.contractCost || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="constructionConsultant" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Construction Consultant</label>
                            <input 
                                type="text" 
                                name="constructionConsultant" 
                                id="constructionConsultant" 
                                value={formData.constructionConsultant || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="implementingOffice" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Implementing Office</label>
                            <input 
                                type="text" 
                                name="implementingOffice" 
                                id="implementingOffice" 
                                value={formData.implementingOffice || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="sourcesOfFund" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Sources of Fund</label>
                            <input 
                                type="text" 
                                name="sourcesOfFund" 
                                id="sourcesOfFund" 
                                value={formData.sourcesOfFund || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="projectManager" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Project Manager</label>
                            <input 
                                type="text" 
                                name="projectManager" 
                                id="projectManager" 
                                value={formData.projectManager || ''} 
                                onChange={handleFormChange} 
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white" 
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end">
                        <button 
                            type="button" 
                            onClick={() => navigate(-1)} 
                            className="bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-white py-2 px-4 rounded-md mr-4 hover:bg-gray-300 dark:hover:bg-slate-500"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600"
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}

export default UpdateProjectPage;