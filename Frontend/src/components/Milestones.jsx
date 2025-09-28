import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Helper to get token
const getToken = () => localStorage.getItem('token');

const Milestones = () => {
    const { projectId } = useParams();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [editingTask, setEditingTask] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [viewMode, setViewMode] = useState('table');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [taskForm, setTaskForm] = useState({
        name: '',
        startDate: '',
        endDate: '',
        phase: '',
        phaseColor: '#3B82F6', // Default blue
        parentPhaseId: '',
        status: 'not started',
        assignedTo: '',
        plannedCost: '',
        resources: '',
        isPhase: false,
        isMilestone: false
    });

    const teamMembers = ['Unassigned', 'glenn', 'john', 'mike', 'sarah'];
    const statuses = ['not started', 'in progress', 'completed', 'on hold'];
    
    // Color options for phases
    const phaseColors = [
        { name: 'Blue', value: '#3B82F6' },
        { name: 'Green', value: '#10B981' },
        { name: 'Yellow', value: '#F59E0B' },
        { name: 'Red', value: '#EF4444' },
        { name: 'Purple', value: '#8B5CF6' },
        { name: 'Pink', value: '#EC4899' },
        { name: 'Indigo', value: '#6366F1' },
        { name: 'Teal', value: '#14B8A6' }
    ];

    // Get phases (items where isPhase = true)
    const phases = tasks.filter(task => task.isPhase);
    
    // Get tasks grouped by phase
    const getTasksByPhase = () => {
        const grouped = {};
        
        // First, add all phases
        phases.forEach(phase => {
            grouped[phase.taskId] = {
                phase: phase,
                tasks: []
            };
        });
        
        // Then, add tasks under their phases
        tasks.filter(task => !task.isPhase).forEach(task => {
            if (task.parentPhaseId && grouped[task.parentPhaseId]) {
                grouped[task.parentPhaseId].tasks.push(task);
            }
        });
        
        return grouped;
    };

    // Fetch tasks for current project
    const fetchProjectTasks = async () => {
        const token = getToken();
        if (!token || !projectId) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`http://localhost:5001/api/tasks/project/${projectId}`, config);
            setTasks(response.data || []);
            setError('');
        } catch (err) {
            console.error('Error fetching tasks:', err);
            if (err.response?.status === 404) {
                setTasks([]);
                setError('');
            } else {
                setError('Failed to load project tasks');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectTasks();
    }, [projectId]);

    const openAddTaskModal = () => {
        setTaskForm({
            name: '',
            startDate: '',
            endDate: '',
            phase: '',
            phaseColor: '#3B82F6',
            parentPhaseId: '',
            status: 'not started',
            assignedTo: '',
            plannedCost: '',
            resources: '',
            isPhase: false,
            isMilestone: false
        });
        setEditingTask(null);
        setShowModal(true);
    };

    const openEditTaskModal = (task) => {
        setTaskForm({
            name: task.name || '',
            startDate: task.startDate || '',
            endDate: task.endDate || '',
            phase: task.phase || '',
            phaseColor: task.phaseColor || '#3B82F6',
            parentPhaseId: task.parentPhaseId || '',
            status: task.status || 'not started',
            assignedTo: task.assignedTo || '',
            plannedCost: task.plannedCost || '',
            resources: task.resources || '',
            isPhase: task.isPhase || false,
            isMilestone: task.isMilestone || false
        });
        setEditingTask(task.taskId);
        setShowModal(true);
    };

    const handleSaveTask = async () => {
        if (!taskForm.name) {
            alert('Please enter a task/phase name');
            return;
        }

        // Validation for tasks (not phases)
        if (!taskForm.isPhase && (!taskForm.startDate || !taskForm.endDate)) {
            alert('Please fill in start and end dates for tasks');
            return;
        }

        setIsSubmitting(true);
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const taskData = {
                ...taskForm,
                projectId,
                plannedCost: parseFloat(taskForm.plannedCost) || 0,
                // If it's a phase, set phase name to the name itself
                phase: taskForm.isPhase ? taskForm.name : taskForm.phase
            };

            if (editingTask) {
                await axios.put(`http://localhost:5001/api/tasks/${editingTask}`, taskData, config);
            } else {
                await axios.post(`http://localhost:5001/api/tasks`, taskData, config);
            }

            setShowModal(false);
            fetchProjectTasks();
        } catch (err) {
            console.error('Error saving task:', err);
            alert('Failed to save task. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (taskId) => {
        setTaskToDelete(taskId);
        setShowDeleteConfirm(true);
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;

        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            await axios.delete(`http://localhost:5001/api/tasks/${taskToDelete}`, config);
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
            fetchProjectTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
            alert('Failed to delete task. Please try again.');
        }
    };

    const renderHierarchicalView = () => {
        const groupedTasks = getTasksByPhase();
        let itemNumber = 1;

        return (
            <div className="space-y-4">
                {Object.values(groupedTasks).map(({ phase, tasks: phaseTasks }) => (
                    <div key={phase.taskId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Phase Header */}
                        <div className="flex items-center p-4 border-l-4" style={{ borderLeftColor: phase.phaseColor }}>
                            <div className="w-8 h-4 mr-3 rounded" style={{ backgroundColor: phase.phaseColor }}></div>
                            <span className="text-lg font-bold text-gray-900">{itemNumber++}. {phase.name}</span>
                            <div className="ml-auto flex space-x-2">
                                <button 
                                    onClick={() => openEditTaskModal(phase)}
                                    className="text-green-600 hover:text-green-800 text-sm"
                                >
                                    edit
                                </button>
                                <button 
                                    onClick={() => confirmDelete(phase.taskId)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                >
                                    delete
                                </button>
                            </div>
                        </div>
                        
                        {/* Phase Tasks */}
                        <div className="bg-gray-50">
                            {phaseTasks.map((task) => (
                                <div key={task.taskId} className="flex items-center p-3 pl-16 border-b border-gray-200 last:border-b-0">
                                    <span className="text-gray-600 mr-4">{itemNumber++}.</span>
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            {task.isMilestone && (
                                                <span className="mr-2 text-yellow-500">♦</span>
                                            )}
                                            <span className="text-gray-800">{task.name}</span>
                                            <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                task.status === 'in progress' ? 'bg-yellow-100 text-yellow-800' :
                                                task.status === 'on hold' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        {task.assignedTo && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                Assigned to: {task.assignedTo}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => openEditTaskModal(task)}
                                            className="text-green-600 hover:text-green-800 text-sm"
                                        >
                                            edit
                                        </button>
                                        <button 
                                            onClick={() => confirmDelete(task.taskId)}
                                            className="text-red-600 hover:text-red-800 text-sm"
                                        >
                                            delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {phaseTasks.length === 0 && (
                                <div className="p-4 pl-16 text-gray-500 text-sm">
                                    No tasks in this phase yet.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {phases.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No phases created yet. Click "Add Task" and select "This is a Phase" to get started.
                    </div>
                )}
            </div>
        );
    };

    const renderGanttChart = () => (
        <div className="bg-gray-100 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-center mb-4 text-gray-700">Project Timeline - Gantt Chart</h3>
            <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                    {/* Timeline Header */}
                    <div className="grid grid-cols-12 gap-0 mb-2">
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium col-span-3">Task</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Jan</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Feb</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Mar</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Apr</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">May</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Jun</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Jul</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Aug</div>
                        <div className="bg-teal-500 text-white text-center py-2 text-sm font-medium">Sep</div>
                    </div>
                    
                    {/* Timeline Rows - Show only tasks with dates */}
                    {tasks.filter(task => !task.isPhase && task.startDate && task.endDate).map((task) => {
                        const startDate = new Date(task.startDate);
                        const endDate = new Date(task.endDate);
                        const projectStart = new Date('2025-01-01');
                        
                        const startOffset = Math.ceil((startDate - projectStart) / (1000 * 60 * 60 * 24));
                        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                        const startMonth = Math.floor(startOffset / 30) + 1;
                        const endMonth = Math.floor((startOffset + duration) / 30) + 1;
                        
                        // Find the parent phase to get the color
                        const parentPhase = phases.find(p => p.taskId === task.parentPhaseId);
                        const taskColor = parentPhase ? parentPhase.phaseColor : '#6B7280';
                        
                        return (
                            <div key={task.taskId} className="grid grid-cols-12 gap-0 mb-1">
                                <div 
                                    className="col-span-3 text-white px-3 py-2 text-sm font-medium flex items-center"
                                    style={{ backgroundColor: taskColor }}
                                >
                                    <div className="flex items-center">
                                        {task.isMilestone && <span className="mr-1 text-yellow-300">♦</span>}
                                        <span className="truncate">{task.name}</span>
                                    </div>
                                </div>
                                {[1,2,3,4,5,6,7,8,9].map((month) => (
                                    <div key={month} className="bg-gray-200 relative h-10 border-r border-gray-300">
                                        {month >= startMonth && month <= endMonth && (
                                            <div 
                                                className="absolute h-6 top-2 rounded-sm opacity-80"
                                                style={{ 
                                                    backgroundColor: taskColor,
                                                    left: month === startMonth ? `${((startOffset % 30) / 30) * 100}%` : '0%',
                                                    right: month === endMonth ? `${(1 - (((startOffset + duration) % 30) / 30)) * 100}%` : '0%'
                                                }}
                                            />
                                        )}
                                        {task.isMilestone && month === startMonth && (
                                            <div className="absolute top-1 left-1/2 transform -translate-x-1/2">
                                                <span className="text-yellow-500 text-lg">♦</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Dynamic Phase Legend based on existing phases */}
            {phases.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    {phases.map(phase => (
                        <div key={phase.taskId} className="flex items-center">
                            <div 
                                className="w-4 h-4 rounded mr-2"
                                style={{ backgroundColor: phase.phaseColor }}
                            ></div>
                            <span className="text-sm text-gray-600">{phase.name}</span>
                        </div>
                    ))}
                </div>
            )}
            
            {tasks.filter(task => !task.isPhase && task.startDate && task.endDate).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No tasks to display in Gantt chart. Add some tasks with dates first.
                </div>
            )}
        </div>
    );

    // Calculate statistics
    const totalTasks = tasks.filter(t => !t.isPhase).length;
    const totalPhases = phases.length;
    const completedTasks = tasks.filter(t => !t.isPhase && t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => !t.isPhase && t.status === 'in progress').length;
    const totalBudget = tasks.reduce((sum, t) => sum + (parseFloat(t.plannedCost) || 0), 0);

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <div className="text-center py-8">
                    <p className="text-gray-500">Loading project tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-bold">Project Phases & Milestones</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                viewMode === 'table' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Table View
                        </button>
                        <button
                            onClick={() => setViewMode('gantt')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                                viewMode === 'gantt' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Gantt Chart
                        </button>
                    </div>
                </div>
                <button 
                    onClick={openAddTaskModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Add Task
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Total Phases</div>
                    <div className="text-2xl font-bold text-blue-800">{totalPhases}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Total Tasks</div>
                    <div className="text-2xl font-bold text-green-800">{totalTasks}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-yellow-600">Completed</div>
                    <div className="text-2xl font-bold text-yellow-800">{completedTasks}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-purple-600">In Progress</div>
                    <div className="text-2xl font-bold text-purple-800">{inProgressTasks}</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-indigo-600">Total Budget</div>
                    <div className="text-2xl font-bold text-indigo-800">₱{totalBudget.toLocaleString()}</div>
                </div>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'table' ? renderHierarchicalView() : renderGanttChart()}

            {/* Enhanced Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6">
                            {editingTask ? 'Edit Task or Phase' : 'Create New Task or Phase'}
                        </h2>
                        
                        {/* Task/Phase Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {taskForm.isPhase ? 'Phase' : 'Task'} Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={taskForm.name}
                                onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={taskForm.isPhase ? "Enter phase name (e.g., Foundation)" : "Enter task name"}
                            />
                        </div>

                        {/* Conditional Fields based on isPhase */}
                        {taskForm.isPhase ? (
                            // Phase Form - Simple
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phase Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {phaseColors.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setTaskForm({...taskForm, phaseColor: color.value})}
                                                className={`w-8 h-8 rounded-full border-2 ${
                                                    taskForm.phaseColor === color.value ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400' : 'border-gray-300'
                                                }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Planned Cost (PHP)</label>
                                    <input
                                        type="number"
                                        value={taskForm.plannedCost}
                                        onChange={(e) => setTaskForm({...taskForm, plannedCost: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Resource Requirements</label>
                                    <textarea
                                        value={taskForm.resources}
                                        onChange={(e) => setTaskForm({...taskForm, resources: e.target.value})}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="List required resources for this phase..."
                                    />
                                </div>
                            </>
                        ) : (
                            // Task Form - Full
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Start Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={taskForm.startDate}
                                            onChange={(e) => setTaskForm({...taskForm, startDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            End Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={taskForm.endDate}
                                            onChange={(e) => setTaskForm({...taskForm, endDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Parent Phase</label>
                                    <select
                                        value={taskForm.parentPhaseId}
                                        onChange={(e) => setTaskForm({...taskForm, parentPhaseId: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select a phase...</option>
                                        {phases.map(phase => (
                                            <option key={phase.taskId} value={phase.taskId}>{phase.name}</option>
                                        ))}
                                    </select>
                                </div>

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

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Planned Cost (PHP)</label>
                                    <input
                                        type="number"
                                        value={taskForm.plannedCost}
                                        onChange={(e) => setTaskForm({...taskForm, plannedCost: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Resource Requirements</label>
                                    <textarea
                                        value={taskForm.resources}
                                        onChange={(e) => setTaskForm({...taskForm, resources: e.target.value})}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="List required personnel, materials, equipment..."
                                    />
                                </div>
                            </>
                        )}

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
                                        checked={taskForm.isMilestone}
                                        onChange={(e) => setTaskForm({...taskForm, isMilestone: e.target.checked})}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700">Mark as Key Milestone (♦)</span>
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
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {isSubmitting ? 'Saving...' : 'Save'}
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
                            Are you sure you want to delete this item? This action cannot be undone.
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