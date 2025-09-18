import React from 'react';
import Layout from '../components/Layout';

const WeekCard = ({ weekNumber }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <h4 className="font-bold mb-3">week {weekNumber}</h4>
        <div className="space-y-3">
            <div className="bg-gray-200 h-8 rounded-md"></div>
            <div className="bg-gray-200 h-8 rounded-md"></div>
            <div className="bg-gray-200 h-8 rounded-md w-2/3"></div>
        </div>
    </div>
);

function ProjectsPage() {
    return (
        <Layout title="Projects">
            <p className="text-gray-500 font-semibold mb-4">ACTIVE PROJECTS 5</p>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content Panel */}
                <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    {/* Placeholder content */}
                    <div className="space-y-6">
                        <div className="bg-gray-200 h-16 rounded-md"></div>
                        <div className="bg-gray-200 h-16 rounded-md"></div>
                        <div className="bg-gray-200 h-16 rounded-md"></div>
                        <div className="bg-gray-200 h-16 rounded-md"></div>
                        <div className="bg-gray-200 h-16 rounded-md"></div>
                    </div>
                </div>

                {/* Right Sidebar with Week Cards */}
                <div className="w-full lg:w-80">
                    <WeekCard weekNumber={1} />
                    <WeekCard weekNumber={2} />
                    <WeekCard weekNumber={3} />
                </div>
            </div>
        </Layout>
    );
}

export default ProjectsPage;