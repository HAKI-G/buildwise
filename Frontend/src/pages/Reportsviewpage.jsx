import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';
import Reports from '../components/Reports.jsx';

const getToken = () => localStorage.getItem('token');

function ReportsViewPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjectName = async () => {
            const token = getToken();
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
                setProjectName(response.data.name);
                localStorage.setItem('lastSelectedProjectId', projectId);
            } catch (error) {
                console.error('Error fetching project:', error);
                setProjectName('Project');
            } finally {
                setLoading(false);
            }
        };

        fetchProjectName();
    }, [projectId, navigate]);

    if (loading) {
        return (
            <Layout title="Loading...">
                <div className="text-center p-8 text-gray-500 dark:text-slate-400">
                    Loading reports...
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={`Reports - ${projectName}`}>
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <Reports projectId={projectId} />
            </div>
        </Layout>
    );
}

export default ReportsViewPage;