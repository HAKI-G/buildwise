import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';

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
            // NOTE: You still need to create this PUT endpoint in your projectController and projectRoutes
            await axios.put(`http://localhost:5001/api/projects/${projectId}`, formData, config);
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
            <div className="bg-white p-8 rounded-xl shadow-md mb-8">
                <h1 className="text-2xl font-bold mb-6">Update Project Information</h1>
                <form onSubmit={handleUpdateProject}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
                            <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                         <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                            <input type="text" name="location" id="location" value={formData.location || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label htmlFor="contractor" className="block text-sm font-medium text-gray-700">Contractor</label>
                            <input type="text" name="contractor" id="contractor" value={formData.contractor || ''} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                        {/* Add all other project form fields here */}
                    </div>
                    <div className="mt-8 flex justify-end">
                         <button type="button" onClick={() => navigate(-1)} className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md mr-4 hover:bg-gray-300">
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}

export default UpdateProjectPage;

