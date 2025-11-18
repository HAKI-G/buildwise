import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import Updates from '../components/Updates';

const getToken = () => localStorage.getItem('token');

function ProjectUpdatesPage() {
    const { projectId } = useParams();
    const [projectData, setProjectData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (projectId) {
            localStorage.setItem('lastSelectedProjectId', projectId);
            
            // Fetch project details
            const fetchProject = async () => {
                const token = getToken();
                if (!token) return;
                
                const config = { headers: { Authorization: `Bearer ${token}` } };
                
                try {
                    const response = await axios.get(
                        `http://localhost:5001/api/projects/${projectId}`, 
                        config
                    );
                    setProjectData(response.data);
                } catch (error) {
                    console.error('Error fetching project:', error);
                } finally {
                    setLoading(false);
                }
            };
            
            fetchProject();
        }
    }, [projectId]);

    if (loading) {
        return (
            <Layout title="Project Updates">
                <div className="flex justify-center items-center h-64">
                    <p className="text-gray-500">Loading project data...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Project Updates">
            <Updates 
                projectData={projectData}
                readonly={projectData?.status === 'Completed'}
            />
        </Layout>
    );
}

export default ProjectUpdatesPage;