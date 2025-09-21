import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar'; // Assuming you have a Navbar component

// --- Hardcoded Data for Design ---
// This data will be used instead of fetching from AWS.
const hardcodedProject = {
    projectId: 'victoria-morato-01',
    name: 'Victoria de Morato',
    location: 'Quezon City',
    status: 'On Track',
    budget: 100,
};

const hardcodedMilestones = [
    { milestoneId: 'm1', milestoneName: 'Foundation Work', status: 'Completed', description: 'Excavation and concrete pouring for the main foundation.', targetDate: '2023-08-15' },
    { milestoneId: 'm2', milestoneName: 'Structural Framing', status: 'In Progress', description: 'Erecting the steel frame for floors 1-5.', targetDate: '2023-09-30' },
    { milestoneId: 'm3', milestoneName: 'Exterior Cladding', status: 'Not Started', description: 'Installation of the building’s exterior walls and windows.', targetDate: '2023-11-01' },
    { milestoneId: 'm4', milestoneName: 'Interior Finishes', status: 'Not Started', description: 'Plumbing, electrical, and drywall installation.', targetDate: '2024-01-20' },
];


function ProjectDetailPage() {
    // We still use useParams to get the ID from the URL, which is good practice.
    const { projectId } = useParams(); 
    
    // --- State is now set directly with hardcoded data ---
    // No more loading, error, or data fetching states needed for now.
    const project = hardcodedProject;
    const milestones = hardcodedMilestones;

    return (
        // Using the main Layout could also be an option here if you have one
        <div className="bg-gray-50 min-h-screen">
            <Navbar />
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                
                {/* --- Project Header Section --- */}
                {project && (
                    <div className="pb-5 border-b border-gray-200 mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
                        <p className="mt-2 text-md text-gray-500">
                            <strong>Location:</strong> {project.location} | <strong>Status:</strong> 
                            <span className="text-green-600 font-semibold"> {project.status}</span>
                        </p>
                    </div>
                )}
                
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">Milestones</h2>

                {/* --- Milestones List --- */}
                {milestones.length > 0 ? (
                    <ul className="space-y-4">
                        {milestones.map(milestone => (
                            <li key={milestone.milestoneId} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-blue-700">{milestone.milestoneName}</h3>
                                    <span 
                                        className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                            milestone.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                            milestone.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                        {milestone.status}
                                    </span>
                                </div>
                                <p className="mt-2 text-gray-600">{milestone.description}</p>
                                <p className="mt-4 text-sm text-gray-500">
                                    <strong>Target Date:</strong> {new Date(milestone.targetDate).toLocaleDateString()}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg border-dashed border-2 border-gray-300">
                        <p className="text-gray-500">No milestones have been added to this project yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectDetailPage;