import React, { useState } from 'react';

const Milestones = () => {
    const [tasks, setTasks] = useState([
        { id: 1, name: 'pouring concrete', status: 'not started', assignedTo: 'glenn', startMonth: 1, duration: 1, startDate: '2025-09-09', endDate: '2025-11-09', parentPhase: 'Foundation Rebar', plannedCost: 5000, resourceRequirements: 'Concrete mixer, workers', isPhase: false, isKeyMilestone: false },
        { id: 2, name: 'pouring concrete', status: 'not started', assignedTo: 'glenn', startMonth: 1.5, duration: 1, startDate: '2025-09-15', endDate: '2025-11-15', parentPhase: 'Foundation Rebar', plannedCost: 5000, resourceRequirements: 'Concrete mixer, workers', isPhase: false, isKeyMilestone: false },
        { id: 3, name: 'pouring concrete', status: 'not started', assignedTo: 'glenn', startMonth: 2.5, duration: 1, startDate: '2025-10-15', endDate: '2025-12-15', parentPhase: 'Foundation Rebar', plannedCost: 5000, resourceRequirements: 'Concrete mixer, workers', isPhase: false, isKeyMilestone: false },
        { id: 4, name: 'pouring concrete', status: 'not started', assignedTo: 'glenn', startMonth: 3.5, duration: 1, startDate: '2025-11-15', endDate: '2026-01-15', parentPhase: 'Foundation Rebar', plannedCost: 5000, resourceRequirements: 'Concrete mixer, workers', isPhase: false, isKeyMilestone: false }
    ]);
    
    const [editingTask, setEditingTask] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [taskForm, setTaskForm] = useState({
        name: '',
        startDate: '',
        endDate: '',
        parentPhase: 'Foundation Rebar',
        status: 'not started',
        assignedTo: '',
        plannedCost: '',
        resourceRequirements: '',
        isPhase: false,
        isKeyMilestone: false
    });

    const teamMembers = ['Unassigned', 'juandelacruz', 'admin', 'Juan dela Cruz'];
    const phases = ['Foundation Rebar', 'Concrete Work', 'Steel Framework', 'Finishing'];
    const statuses = ['not started', 'in progress', 'completed', 'on hold'];

    const openAddTaskModal = () => {
        setTaskForm({
            name: '',
            startDate: '',
            endDate: '',
            parentPhase: 'Foundation Rebar',
            status: 'not started',
            assignedTo: '',
            plannedCost: '',
            resourceRequirements: '',
            isPhase: false,
            isKeyMilestone: false
        });
        setEditingTask(null);
        setShowModal(true);
    };

    const openEditTaskModal = (task) => {
        setTaskForm({ ...task });
        setEditingTask(task.id);
        setShowModal(true);
    };

    const handleSaveTask = () => {
        if (taskForm.name && (taskForm.isPhase || (taskForm.startDate && taskForm.endDate))) {
            let startMonth = 1;
            let duration = 1;
            
            if (!taskForm.isPhase && taskForm.startDate && taskForm.endDate) {
                const startDate = new Date(taskForm.startDate);
                const endDate = new Date(taskForm.endDate);
                startMonth = ((startDate.getMonth() + 1) + (startDate.getDate() - 1) / 30);
                duration = (endDate - startDate) / (1000 * 60 * 60 * 24 * 30);
            }

            const taskData = {
                ...taskForm,
                startMonth,
                duration,
                plannedCost: parseFloat(taskForm.plannedCost) || 0
            };

            if (editingTask) {
                setTasks(tasks.map(task => task.id === editingTask ? { ...taskData, id: editingTask } : task));
            } else {
                setTasks([...tasks, { ...taskData, id: Date.now() }]);
            }
            setShowModal(false);
        }
    };

    const confirmDelete = (id) => {
        setTaskToDelete(id);
        setShowDeleteConfirm(true);
    };

    const handleDeleteTask = () => {
        if (taskToDelete) {
            setTasks(tasks.filter(task => task.id !== taskToDelete));
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Milestones</h2>
                <button 
                    onClick={openAddTaskModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Add Task
                </button>
            </div>

            {/* Task Table */}
            <div className="overflow-x-auto mb-8">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">task name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">status</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">assigned to</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {tasks.map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{task.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{task.status}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{task.assignedTo || 'Unassigned'}</td>
                                <td className="px-4 py-3 text-sm">
                                    <button 
                                        onClick={() => openEditTaskModal(task)}
                                        className="text-green-600 hover:text-green-800 mr-3"
                                    >
                                        edit
                                    </button>
                                    <button 
                                        onClick={() => confirmDelete(task.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Task Timeline */}
            <div className="bg-gray-100 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-center mb-4 text-gray-700">Task Timeline</h3>
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        {/* Timeline Header */}
                        <div className="grid grid-cols-6 gap-0 mb-2">
                            <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Task</div>
                            <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Month 1</div>
                            <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Month 2</div>
                            <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Month 3</div>
                            <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Month 4</div>
                            <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Month 5</div>
                        </div>
                        
                        {/* Timeline Rows */}
                        {tasks.map((task, index) => (
                            <div key={task.id} className="grid grid-cols-6 gap-0 mb-1">
                                <div className="bg-teal-600 text-white px-3 py-2 text-sm font-medium">
                                    Task {index + 1}
                                </div>
                                {[1, 2, 3, 4, 5].map((month) => (
                                    <div key={month} className="bg-gray-200 relative h-10 border-r border-gray-300 last:border-r-0">
                                        {month >= task.startMonth && month < task.startMonth + task.duration && (
                                            <div 
                                                className="absolute bg-teal-400 h-6 top-2 rounded-sm"
                                                style={{
                                                    left: month === Math.floor(task.startMonth) ? `${(task.startMonth % 1) * 100}%` : '0%',
                                                    right: month === Math.floor(task.startMonth + task.duration) 
                                                        ? `${(1 - ((task.startMonth + task.duration) % 1)) * 100}%` 
                                                        : '0%',
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Edit/Add Task Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6">Edit Task or Phase</h2>
                        
                        {/* Task/Phase Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Task / Phase Name</label>
                            <input
                                type="text"
                                value={taskForm.name}
                                onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Pouring Concrete"
                            />
                        </div>

                        {/* Conditional Fields */}
                        {!taskForm.isPhase && (
                            <>
                                {/* Start Date and End Date */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            value={taskForm.startDate}
                                            onChange={(e) => setTaskForm({...taskForm, startDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            value={taskForm.endDate}
                                            onChange={(e) => setTaskForm({...taskForm, endDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Parent Phase */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Parent Phase</label>
                                    <select
                                        value={taskForm.parentPhase}
                                        onChange={(e) => setTaskForm({...taskForm, parentPhase: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {phases.map(phase => (
                                            <option key={phase} value={phase}>{phase}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status and Assigned To */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                        <select
                                            value={taskForm.status}
                                            onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {statuses.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                                        <select
                                            value={taskForm.assignedTo}
                                            onChange={(e) => setTaskForm({...taskForm, assignedTo: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {teamMembers.map(member => (
                                                <option key={member} value={member}>{member}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Planned Cost */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Planned Cost (PHP)</label>
                            <input
                                type="number"
                                value={taskForm.plannedCost}
                                onChange={(e) => setTaskForm({...taskForm, plannedCost: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="5000"
                            />
                        </div>

                        {/* Resource Requirements */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Resource Requirements</label>
                            <textarea
                                value={taskForm.resourceRequirements}
                                onChange={(e) => setTaskForm({...taskForm, resourceRequirements: e.target.value})}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="List required resources, equipment, materials..."
                            />
                        </div>

                        {/* Checkboxes */}
                        <div className="flex gap-6 mb-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={taskForm.isPhase}
                                    onChange={(e) => setTaskForm({...taskForm, isPhase: e.target.checked})}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700">This is a Phase</span>
                            </label>
                            {!taskForm.isPhase && (
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={taskForm.isKeyMilestone}
                                        onChange={(e) => setTaskForm({...taskForm, isKeyMilestone: e.target.checked})}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">Mark as Key Milestone (★)</span>
                                </label>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTask}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-4">Confirm Delete</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this milestone? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteTask}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Milestones;