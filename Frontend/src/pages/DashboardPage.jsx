import React from 'react';
import Layout from '../components/Layout';

const ProjectRow = ({ project }) => (
    <div className="flex items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
        <img src={project.image} alt={project.name} className="w-12 h-12 rounded-lg mr-4" />
        <div className="flex-1">
            <div className="font-bold">{project.name}</div>
        </div>
        <div className="w-1/4 mx-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Task</span>
                <span>{project.taskProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${project.taskProgress}%` }}></div>
            </div>
        </div>
        <div className="w-1/4 mx-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Budget</span>
                <span>${project.budget}m</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${project.budgetProgress}%` }}></div>
            </div>
        </div>
        <div className="w-48 text-center bg-stone-100 p-2 rounded-lg mx-4">
            Due to {project.dueDate}
        </div>
        <div className="flex -space-x-2">
            {project.team.map(memberImg => <img key={memberImg} className="inline-block h-8 w-8 rounded-full ring-2 ring-white" src={memberImg} alt="Team member" />)}
        </div>
    </div>
);

function DashboardPage() {
    // This would come from your API call
    const projectsData = [
        { name: 'Victoria de Morato', image: 'https://placekitten.com/g/100/100', taskProgress: 90, budget: 100, budgetProgress: 100, dueDate: '28 Feb 2023', team: ['https://i.pravatar.cc/32?img=1', 'https://i.pravatar.cc/32?img=2', 'https://i.pravatar.cc/32?img=3'] },
        { name: 'Victoria de Hidalgo', image: 'https://placekitten.com/g/101/101', taskProgress: 90, budget: 100, budgetProgress: 100, dueDate: '28 Feb 2023', team: ['https://i.pravatar.cc/32?img=4', 'https://i.pravatar.cc/32?img=5', 'https://i.pravatar.cc/32?img=6'] },
        { name: 'Fort Victoria', image: 'https://placekitten.com/g/102/102', taskProgress: 90, budget: 100, budgetProgress: 100, dueDate: '28 Feb 2023', team: ['https://i.pravatar.cc/32?img=7', 'https://i.pravatar.cc/32?img=8', 'https://i.pravatar.cc/32?img=9'] },
        { name: 'Philippine Arena', image: 'https://placekitten.com/g/103/103', taskProgress: 90, budget: 100, budgetProgress: 100, dueDate: '28 Feb 2023', team: ['https://i.pravatar.cc/32?img=10', 'https://i.pravatar.cc/32?img=11', 'https://i.pravatar.cc/32?img=12'] },
        { name: 'Las Casas', image: 'https://placekitten.com/g/104/104', taskProgress: 90, budget: 100, budgetProgress: 100, dueDate: '28 Feb 2023', team: ['https://i.pravatar.cc/32?img=13', 'https://i.pravatar.cc/32?img=14', 'https://i.pravatar.cc/32?img=15'] },
    ];

    return (
        <Layout title="Dashboard">
            <div>
                <p className="text-gray-500 font-semibold mb-4">ACTIVE PROJECTS 5</p>
                {projectsData.map(project => <ProjectRow key={project.name} project={project} />)}
            </div>
        </Layout>
    );
}

export default DashboardPage;