import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Milestones from '../components/Milestones';

function ProjectMilestonesPage() {
    const { projectId } = useParams();
    
    // Store the selected project in localStorage
    React.useEffect(() => {
        if (projectId) {
            localStorage.setItem('lastSelectedProjectId', projectId);
        }
    }, [projectId]);

    return (
        <Layout title="Project Milestones">
            <Milestones />
        </Layout>
    );
}

export default ProjectMilestonesPage;
