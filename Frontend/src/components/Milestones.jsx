import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Helper to get token
const getToken = () => localStorage.getItem('token');

// Helper to format numbers with commas
const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0';
    return parseInt(amount).toLocaleString();
};

// Helper to parse currency input (remove commas)
const parseCurrency = (value) => {
    return value.toString().replace(/,/g, '');
};

// Helper to extract phase numbers from phase names (Phase1, Phase2, etc.)
const extractPhaseNumber = (phaseName) => {
    if (!phaseName) return null;
    const match = phaseName.match(/Phase(\d+)/i);
    return match ? parseInt(match[1]) : null;
};

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
        phaseColor: '#3B82F6',
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
    
    const phaseColors = [
        { name: 'Blue', value: '#3B82F6' },
        { name: 'Green', value: '#10B981' },
        { name: 'Yellow', value: '#F59E0B' },
        { name: 'Red', value: '#EF4444' },
        { name: 'Purple', value: '#8B5CF6' },
        { name: 'Pink', value: '#EC4899' },
        { name: 'Indigo', value: '#6366F1' },
        { name: 'Teal', value: '#14B8A6' },
        { name: 'Orange', value: '#F97316' },
        { name: 'Cyan', value: '#06B6D4' }
    ];

    const phases = tasks.filter(task => task.isPhase === true);
    
    const getTasksByPhase = () => {
        const grouped = {};
        
        phases.forEach(phase => {
            grouped[phase.milestoneId] = {
                phase: phase,
                tasks: []
            };
        });
        
        tasks.filter(task => task.isPhase !== true).forEach(task => {
            if (task.parentPhase && grouped[task.parentPhase]) {
                grouped[task.parentPhase].tasks.push(task);
            } else if (!task.parentPhase) {
                if (!grouped['unassigned']) {
                    grouped['unassigned'] = {
                        phase: { milestoneId: 'unassigned', milestoneName: 'Unassigned Tasks', phaseColor: '#9CA3AF' },
                        tasks: []
                    };
                }
                grouped['unassigned'].tasks.push(task);
            }
        });
        
        return grouped;
    };

    const fetchProjectTasks = async () => {
        const token = getToken();
        if (!token || !projectId) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`http://localhost:5001/api/milestones/project/${projectId}`, config);
            
            const mappedTasks = (response.data || []).map(task => ({
                ...task,
                milestoneId: task.milestoneId,
                milestoneName: task.milestoneName || task.taskName || task.name || 'Unnamed Task',
                name: task.milestoneName || task.taskName || task.name || 'Unnamed Task',
                startDate: task.startDate,
                endDate: task.endDate || task.targetDate,
                targetDate: task.targetDate || task.endDate,
                parentPhase: task.parentPhase,
                parentPhaseId: task.parentPhase,
                phaseColor: task.phaseColor || '#3B82F6',
                resources: task.resourceRequirements || task.resources || '',
                resourceRequirements: task.resourceRequirements || task.resources || '',
                isMilestone: task.isKeyMilestone || task.isMilestone || false,
                isKeyMilestone: task.isKeyMilestone || task.isMilestone || false,
                status: task.status || 'not started',
                assignedTo: task.assignedTo || 'Unassigned',
                plannedCost: task.plannedCost || 0,
                isPhase: task.isPhase || false
            }));
            
            setTasks(mappedTasks);
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
            assignedTo: 'Unassigned',
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
            name: task.milestoneName || task.name || '',
            startDate: task.startDate || '',
            endDate: task.endDate || task.targetDate || '',
            phase: task.phase || '',
            phaseColor: task.phaseColor || '#3B82F6',
            parentPhaseId: task.parentPhase || task.parentPhaseId || '',
            status: task.status || 'not started',
            assignedTo: task.assignedTo || 'Unassigned',
            plannedCost: task.plannedCost || '',
            resources: task.resourceRequirements || task.resources || '',
            isPhase: task.isPhase || false,
            isMilestone: task.isKeyMilestone || task.isMilestone || false
        });
        setEditingTask(task.milestoneId);
        setShowModal(true);
    };

    const handleCostChange = (value) => {
        const numericValue = parseCurrency(value);
        setTaskForm({...taskForm, plannedCost: numericValue});
    };

    const handleSaveTask = async () => {
        if (!taskForm.name.trim()) {
            alert('Please enter a task/phase name');
            return;
        }

        if (!taskForm.isPhase && (!taskForm.startDate || !taskForm.endDate)) {
            alert('Please fill in start and end dates for tasks');
            return;
        }

        setIsSubmitting(true);
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const taskData = {
                projectId,
                milestoneName: taskForm.name.trim(),
                taskName: taskForm.name.trim(),
                startDate: taskForm.startDate,
                endDate: taskForm.endDate,
                targetDate: taskForm.endDate,
                parentPhase: taskForm.parentPhaseId || null,
                status: taskForm.status,
                assignedTo: taskForm.assignedTo,
                plannedCost: parseFloat(parseCurrency(taskForm.plannedCost)) || 0,
                resourceRequirements: taskForm.resources,
                isPhase: taskForm.isPhase,
                isKeyMilestone: taskForm.isMilestone,
                phaseColor: taskForm.phaseColor || '#3B82F6',
                description: taskForm.resources,
                createdAt: editingTask ? undefined : new Date().toISOString()
            };

            if (editingTask) {
                await axios.put(`http://localhost:5001/api/milestones/${projectId}/${editingTask}`, taskData, config);
            } else {
                await axios.post(`http://localhost:5001/api/milestones/${projectId}`, taskData, config);
            }

            setShowModal(false);
            await fetchProjectTasks();
        } catch (err) {
            console.error('Error saving task:', err);
            alert('Failed to save task. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = (milestoneId) => {
        setTaskToDelete(milestoneId);
        setShowDeleteConfirm(true);
    };

    const handleDeleteTask = async () => {
        if (!taskToDelete) return;

        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            await axios.delete(`http://localhost:5001/api/milestones/${projectId}/${taskToDelete}`, config);
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
            await fetchProjectTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
            alert('Failed to delete task. Please try again.');
        }
    };

    const renderHierarchicalView = () => {
        const groupedTasks = getTasksByPhase();
        
        const sortedGroups = Object.values(groupedTasks).sort((a, b) => {
            if (a.phase.milestoneId === 'unassigned') return 1;
            if (b.phase.milestoneId === 'unassigned') return -1;
            
            const aNumber = extractPhaseNumber(a.phase.milestoneName || a.phase.name || '');
            const bNumber = extractPhaseNumber(b.phase.milestoneName || b.phase.name || '');
            
            if (aNumber !== null && bNumber !== null) {
                return aNumber - bNumber;
            }
            
            return (a.phase.milestoneName || a.phase.name || '').localeCompare(
                b.phase.milestoneName || b.phase.name || ''
            );
        });

        return (
            <div className="space-y-3">
                <div className="text-xs text-gray-500 dark:text-slate-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                    Debug: Found {tasks.length} total items, {phases.length} phases, {tasks.filter(t => !t.isPhase).length} tasks
                </div>
                
                {sortedGroups.map(({ phase, tasks: phaseTasks }) => (
                    <div key={phase.milestoneId} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <div className="flex items-center p-3 border-l-4 bg-white dark:bg-slate-800" style={{ borderLeftColor: phase.phaseColor }}>
                            <div className="w-6 h-3 mr-3 rounded" style={{ backgroundColor: phase.phaseColor }}></div>
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                                {phase.milestoneName || phase.name || 'Unnamed Phase'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400 ml-2">
                                (ID: {phase.milestoneId})
                            </span>
                            <div className="ml-auto flex space-x-2">
                                {phase.milestoneId !== 'unassigned' && (
                                    <>
                                        <button 
                                            onClick={() => openEditTaskModal(phase)}
                                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs"
                                        >
                                            edit
                                        </button>
                                        <button 
                                            onClick={() => confirmDelete(phase.milestoneId)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                                        >
                                            delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-slate-900/50">
                            {phaseTasks.map((task) => (
                                <div key={task.milestoneId} className="flex items-center p-2 pl-12 border-b border-gray-200 dark:border-slate-700 last:border-b-0">
                                    <span className="text-gray-600 dark:text-slate-400 mr-3 text-sm">•</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                            {task.isKeyMilestone && (
                                                <span className="mr-2 text-yellow-500 text-sm">♦</span>
                                            )}
                                            <span className="text-gray-800 dark:text-white font-medium text-sm truncate">
                                                {task.milestoneName || task.name || 'Unnamed Task'}
                                            </span>
                                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                task.status === 'in progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                task.status === 'on hold' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                            }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="flex space-x-4 text-xs text-gray-500 dark:text-slate-400 mt-1">
                                            {task.assignedTo && task.assignedTo !== 'Unassigned' && (
                                                <span>Assigned: {task.assignedTo}</span>
                                            )}
                                            {task.endDate && (
                                                <span>Due: {new Date(task.endDate).toLocaleDateString()}</span>
                                            )}
                                            {task.plannedCost > 0 && (
                                                <span>Cost: ₱{formatCurrency(task.plannedCost)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 ml-2">
                                        <button 
                                            onClick={() => openEditTaskModal(task)}
                                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs"
                                        >
                                            edit
                                        </button>
                                        <button 
                                            onClick={() => confirmDelete(task.milestoneId)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs"
                                        >
                                            delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {phaseTasks.length === 0 && (
                                <div className="p-3 pl-12 text-gray-500 dark:text-slate-400 text-xs">
                                    No tasks in this phase yet.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {Object.keys(groupedTasks).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                        No tasks or phases created yet. Click "Add Task" to get started.
                    </div>
                )}
            </div>
        );
    };

    const renderGanttChart = () => {
        const tasksWithDates = tasks.filter(task => 
            !task.isPhase && 
            task.startDate && 
            (task.endDate || task.targetDate) &&
            task.milestoneName
        );

        if (tasksWithDates.length === 0) {
            return (
                <div className="bg-gray-100 dark:bg-slate-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-center mb-4 text-gray-700 dark:text-slate-300">Project Timeline - Gantt Chart</h3>
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                        No tasks to display in Gantt chart. Add some tasks with start and end dates first.
                    </div>
                </div>
            );
        }

        const allDates = tasksWithDates.flatMap(task => [
            new Date(task.startDate),
            new Date(task.endDate || task.targetDate)
        ]);
        
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        const startYear = minDate.getFullYear();
        const endYear = maxDate.getFullYear();
        
        const months = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        for (let year = startYear; year <= endYear; year++) {
            for (let month = 0; month < 12; month++) {
                months.push({
                    name: monthNames[month],
                    year: year,
                    date: new Date(year, month, 1),
                    label: year === startYear && month === 0 ? `${monthNames[month]} ${year}` : 
                           (month === 0 || (year > startYear && months.length === 0)) ? `${monthNames[month]} ${year}` : 
                           monthNames[month]
                });
            }
        }

        return (
            <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-center mb-4 text-gray-700 dark:text-slate-300">Project Timeline - Gantt Chart</h3>
                <div className="overflow-x-auto">
                    <div style={{ minWidth: `${Math.max(800, months.length * 60 + 200)}px` }}>
                        <div className="grid gap-0 mb-2" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
                            <div className="bg-teal-500 dark:bg-teal-600 text-white text-center py-2 text-xs font-medium">Task</div>
                            {months.map((month, index) => (
                                <div key={index} className="bg-teal-500 dark:bg-teal-600 text-white text-center py-2 text-xs font-medium border-r border-teal-400 dark:border-teal-700">
                                    <div>{month.name}</div>
                                    {(index === 0 || month.name === 'Jan') && (
                                        <div className="text-xs opacity-75">{month.year}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {tasksWithDates.map((task) => {
                            const taskStart = new Date(task.startDate);
                            const taskEnd = new Date(task.endDate || task.targetDate);
                            
                            const taskMonths = months.map((month, index) => {
                                const monthStart = new Date(month.year, months.indexOf(month) % 12, 1);
                                const monthEnd = new Date(month.year, months.indexOf(month) % 12 + 1, 0);
                                
                                const overlaps = taskStart <= monthEnd && taskEnd >= monthStart;
                                
                                if (!overlaps) return null;
                                
                                const overlapStart = new Date(Math.max(taskStart, monthStart));
                                const overlapEnd = new Date(Math.min(taskEnd, monthEnd));
                                
                                const monthDays = monthEnd.getDate();
                                const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                                
                                const startOffset = Math.max(0, (overlapStart.getDate() - 1) / monthDays);
                                const endOffset = Math.max(0, (monthDays - overlapEnd.getDate()) / monthDays);
                                
                                return {
                                    index,
                                    leftOffset: startOffset * 100,
                                    rightOffset: endOffset * 100,
                                    isStart: overlapStart.getTime() === taskStart.getTime(),
                                    isEnd: overlapEnd.getTime() === taskEnd.getTime()
                                };
                            }).filter(Boolean);
                            
                            const parentPhase = phases.find(p => p.milestoneId === task.parentPhase);
                            const taskColor = parentPhase ? parentPhase.phaseColor : '#6B7280';
                            
                            return (
                                <div key={task.milestoneId} className="grid gap-0 mb-1" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
                                    <div 
                                        className="text-white px-2 py-2 text-xs font-medium flex items-center"
                                        style={{ backgroundColor: taskColor }}
                                    >
                                        <div className="flex items-center w-full min-w-0">
                                            {task.isKeyMilestone && <span className="mr-1 text-yellow-300 flex-shrink-0">♦</span>}
                                            <span className="truncate">{task.milestoneName || task.name}</span>
                                        </div>
                                    </div>
                                    {months.map((month, monthIndex) => {
                                        const taskMonth = taskMonths.find(tm => tm.index === monthIndex);
                                        return (
                                            <div key={monthIndex} className="bg-gray-200 dark:bg-slate-700 relative h-8 border-r border-gray-300 dark:border-slate-600">
                                                {taskMonth && (
                                                    <div 
                                                        className="absolute h-4 top-2 opacity-80 rounded-sm"
                                                        style={{ 
                                                            backgroundColor: taskColor,
                                                            left: `${taskMonth.leftOffset}%`,
                                                            right: `${taskMonth.rightOffset}%`
                                                        }}
                                                    />
                                                )}
                                                {task.isKeyMilestone && taskMonth?.isStart && (
                                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
                                                        <span className="text-yellow-500 text-sm">♦</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {phases.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3 justify-center">
                        {phases.map(phase => (
                            <div key={phase.milestoneId} className="flex items-center">
                                <div 
                                    className="w-3 h-3 rounded mr-2"
                                    style={{ backgroundColor: phase.phaseColor }}
                                ></div>
                                <span className="text-xs text-gray-600 dark:text-slate-400">
                                    {phase.milestoneName || phase.name || 'Unnamed Phase'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const totalTasks = tasks.filter(t => t.isPhase !== true).length;
    const totalPhases = phases.length;
    const completedTasks = tasks.filter(t => t.isPhase !== true && t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.isPhase !== true && t.status === 'in progress').length;
    const totalBudget = tasks.reduce((sum, t) => sum + (parseFloat(t.plannedCost) || 0), 0);

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-slate-400">Loading project tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Project Phases & Milestones</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                viewMode === 'table' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                            }`}
                        >
                            Table View
                        </button>
                        <button
                            onClick={() => setViewMode('gantt')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                viewMode === 'gantt' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                            }`}
                        >
                            Gantt Chart
                        </button>
                    </div>
                </div>
                <button 
                    onClick={openAddTaskModal}
                    className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700"
                >
                    Add Task
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Phases</div>
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-300">{totalPhases}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-green-600 dark:text-green-400">Total Tasks</div>
                    <div className="text-xl font-bold text-green-800 dark:text-green-300">{totalTasks}</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Completed</div>
                    <div className="text-xl font-bold text-yellow-800 dark:text-yellow-300">{completedTasks}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-purple-600 dark:text-purple-400">In Progress</div>
                    <div className="text-xl font-bold text-purple-800 dark:text-purple-300">{inProgressTasks}</div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Total Budget</div>
                    <div className="text-xl font-bold text-indigo-800 dark:text-indigo-300">₱{formatCurrency(totalBudget)}</div>
                </div>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'table' ? renderHierarchicalView() : renderGanttChart()}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                            {editingTask ? 'Edit Task or Phase' : 'Create New Task or Phase'}
                        </h2>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                {taskForm.isPhase ? 'Phase' : 'Task'} Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={taskForm.name}
                                onChange={(e) => setTaskForm({...taskForm, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={taskForm.isPhase ? "Enter phase name (e.g., Foundation)" : "Enter task name"}
                            />
                        </div>

                        {taskForm.isPhase ? (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Phase Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {phaseColors.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setTaskForm({...taskForm, phaseColor: color.value})}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                    taskForm.phaseColor === color.value 
                                                        ? 'border-gray-800 dark:border-white ring-2 ring-offset-2 ring-gray-400 dark:ring-slate-500 scale-110' 
                                                        : 'border-gray-300 dark:border-slate-600 hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                                        Selected: <span 
                                            className="inline-block w-4 h-4 rounded-full mr-2 align-middle" 
                                            style={{ backgroundColor: taskForm.phaseColor }}
                                        ></span>
                                        {phaseColors.find(c => c.value === taskForm.phaseColor)?.name || 'Custom'}
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Planned Cost (PHP)</label>
                                    <input
                                        type="text"
                                        value={taskForm.plannedCost ? formatCurrency(taskForm.plannedCost) : ''}
                                        onChange={(e) => handleCostChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Resource Requirements</label>
                                    <textarea
                                        value={taskForm.resources}
                                        onChange={(e) => setTaskForm({...taskForm, resources: e.target.value})}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="List required resources for this phase..."
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                            Start Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={taskForm.startDate}
                                            onChange={(e) => setTaskForm({...taskForm, startDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                            End Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={taskForm.endDate}
                                            onChange={(e) => setTaskForm({...taskForm, endDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Parent Phase</label>
                                    <select
                                        value={taskForm.parentPhaseId}
                                        onChange={(e) => setTaskForm({...taskForm, parentPhaseId: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select a phase...</option>
                                        {phases.map(phase => (
                                            <option key={phase.milestoneId} value={phase.milestoneId}>
                                                {phase.milestoneName || phase.name || 'Unnamed Phase'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Status</label>
                                        <select
                                            value={taskForm.status}
                                            onChange={(e) => setTaskForm({...taskForm, status: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {statuses.map(status => (
                                                <option key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Assigned To</label>
                                        <select
                                            value={taskForm.assignedTo}
                                            onChange={(e) => setTaskForm({...taskForm, assignedTo: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {teamMembers.map(member => (
                                                <option key={member} value={member}>{member}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Planned Cost (PHP)</label>
                                    <input
                                        type="text"
                                        value={taskForm.plannedCost ? formatCurrency(taskForm.plannedCost) : ''}
                                        onChange={(e) => handleCostChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Resource Requirements</label>
                                    <textarea
                                        value={taskForm.resources}
                                        onChange={(e) => setTaskForm({...taskForm, resources: e.target.value})}
                                        rows="3"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="List required personnel, materials, equipment..."
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex gap-6 mb-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={taskForm.isPhase}
                                    onChange={(e) => setTaskForm({...taskForm, isPhase: e.target.checked})}
                                    className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-slate-300">This is a Phase</span>
                            </label>
                            {!taskForm.isPhase && (
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={taskForm.isMilestone}
                                        onChange={(e) => setTaskForm({...taskForm, isMilestone: e.target.checked})}
                                        className="mr-2"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-slate-300">Mark as Key Milestone (♦)</span>
                                </label>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
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
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Confirm Delete</h3>
                        <p className="text-gray-600 dark:text-slate-400 mb-6">
                            Are you sure you want to delete this item? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="px-4 py-2 text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
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