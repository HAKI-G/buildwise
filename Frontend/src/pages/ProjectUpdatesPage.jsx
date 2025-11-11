import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Updates from '../components/Updates';

function ProjectUpdatesPage() {
    const { projectId } = useParams();
    
    // Store the selected project in localStorage
    React.useEffect(() => {
        if (projectId) {
            localStorage.setItem('lastSelectedProjectId', projectId);
        }
    }, [projectId]);

    return (
        <Layout title="Project Updates">
            <Updates />
        </Layout>
    );
}

export default ProjectUpdatesPage;
