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
    
    // Color options for phases - FIXED: More distinct colors
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

    // Get phases (items where isPhase = true)
    const phases = tasks.filter(task => task.isPhase === true);
    
    // Get tasks grouped by phase
    const getTasksByPhase = () => {
        const grouped = {};
        
        // First, add all phases
        phases.forEach(phase => {
            grouped[phase.milestoneId] = {
                phase: phase,
                tasks: []
            };
        });
        
        // Then, add tasks under their phases
        tasks.filter(task => task.isPhase !== true).forEach(task => {
            if (task.parentPhase && grouped[task.parentPhase]) {
                grouped[task.parentPhase].tasks.push(task);
            } else if (!task.parentPhase) {
                // Tasks without parent phase - create a default group
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

    // Fetch tasks for current project
    const fetchProjectTasks = async () => {
        const token = getToken();
        if (!token || !projectId) return;

        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`http://localhost:5001/api/milestones/project/${projectId}`, config);
            
            console.log('Raw API Response:', response.data);
            
            // FIXED: Better field mapping with proper color preservation
            const mappedTasks = (response.data || []).map(task => {
                console.log('Mapping task:', task);
                return {
                    ...task,
                    milestoneId: task.milestoneId,
                    milestoneName: task.milestoneName || task.taskName || task.name || 'Unnamed Task',
                    name: task.milestoneName || task.taskName || task.name || 'Unnamed Task',
                    startDate: task.startDate,
                    endDate: task.endDate || task.targetDate,
                    targetDate: task.targetDate || task.endDate,
                    parentPhase: task.parentPhase,
                    parentPhaseId: task.parentPhase,
                    phaseColor: task.phaseColor || '#3B82F6', // FIXED: Preserve phase color from DB
                    resources: task.resourceRequirements || task.resources || '',
                    resourceRequirements: task.resourceRequirements || task.resources || '',
                    isMilestone: task.isKeyMilestone || task.isMilestone || false,
                    isKeyMilestone: task.isKeyMilestone || task.isMilestone || false,
                    status: task.status || 'not started',
                    assignedTo: task.assignedTo || 'Unassigned',
                    plannedCost: task.plannedCost || 0,
                    isPhase: task.isPhase || false
                };
            });
            
            console.log('Mapped tasks:', mappedTasks);
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
        console.log('Editing task:', task);
        setTaskForm({
            name: task.milestoneName || task.name || '',
            startDate: task.startDate || '',
            endDate: task.endDate || task.targetDate || '',
            phase: task.phase || '',
            phaseColor: task.phaseColor || '#3B82F6', // FIXED: Load existing color
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

        // Validation for tasks (not phases)
        if (!taskForm.isPhase && (!taskForm.startDate || !taskForm.endDate)) {
            alert('Please fill in start and end dates for tasks');
            return;
        }

        setIsSubmitting(true);
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // FIXED: Ensure phase color is always included in the request
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
                phaseColor: taskForm.phaseColor || '#3B82F6', // FIXED: Ensure color is always sent
                description: taskForm.resources,
                // FIXED: Add creation timestamp to maintain order
                createdAt: editingTask ? undefined : new Date().toISOString()
            };

            console.log('Sending task data with color:', taskData);

            if (editingTask) {
                await axios.put(`http://localhost:5001/api/milestones/${projectId}/${editingTask}`, taskData, config);
            } else {
                await axios.post(`http://localhost:5001/api/milestones/${projectId}`, taskData, config);
            }

            setShowModal(false);
            await fetchProjectTasks();
        } catch (err) {
            console.error('Error saving task:', err);
            console.error('Response data:', err.response?.data);
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

    // FIXED: Add debugging and better phase management
    const renderHierarchicalView = () => {
        const groupedTasks = getTasksByPhase();
        
        console.log('All tasks for debugging:', tasks);
        console.log('Grouped tasks:', groupedTasks);
        
        // FIXED: Sort phases by creation time or use original order
        const sortedGroups = Object.values(groupedTasks).sort((a, b) => {
            // Keep 'unassigned' at the end
            if (a.phase.milestoneId === 'unassigned') return 1;
            if (b.phase.milestoneId === 'unassigned') return -1;
            
            // Try to preserve original creation order by using the actual phase names
            // Extract phase numbers if they exist (Phase1, Phase2, etc.)
            const aNumber = extractPhaseNumber(a.phase.milestoneName || a.phase.name || '');
            const bNumber = extractPhaseNumber(b.phase.milestoneName || b.phase.name || '');
            
            if (aNumber !== null && bNumber !== null) {
                return aNumber - bNumber;
            }
            
            // Fallback to string comparison
            return (a.phase.milestoneName || a.phase.name || '').localeCompare(
                b.phase.milestoneName || b.phase.name || ''
            );
        });

        return (
            <div className="space-y-3">
                {/* Debug info - remove this in production */}
                <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    Debug: Found {tasks.length} total items, {phases.length} phases, {tasks.filter(t => !t.isPhase).length} tasks
                </div>
                
                {sortedGroups.map(({ phase, tasks: phaseTasks }, phaseIndex) => (
                    <div key={phase.milestoneId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Phase Header - Show phase name without renumbering */}
                        <div className="flex items-center p-3 border-l-4" style={{ borderLeftColor: phase.phaseColor }}>
                            <div className="w-6 h-3 mr-3 rounded" style={{ backgroundColor: phase.phaseColor }}></div>
                            <span className="text-base font-bold text-gray-900">
                                {phase.milestoneName || phase.name || 'Unnamed Phase'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                                (ID: {phase.milestoneId})
                            </span>
                            <div className="ml-auto flex space-x-2">
                                {phase.milestoneId !== 'unassigned' && (
                                    <>
                                        <button 
                                            onClick={() => openEditTaskModal(phase)}
                                            className="text-green-600 hover:text-green-800 text-xs"
                                        >
                                            edit
                                        </button>
                                        <button 
                                            onClick={() => confirmDelete(phase.milestoneId)}
                                            className="text-red-600 hover:text-red-800 text-xs"
                                        >
                                            delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {/* Phase Tasks */}
                        <div className="bg-gray-50">
                            {phaseTasks.map((task, taskIndex) => (
                                <div key={task.milestoneId} className="flex items-center p-2 pl-12 border-b border-gray-200 last:border-b-0">
                                    <span className="text-gray-600 mr-3 text-sm">•</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center">
                                            {task.isKeyMilestone && (
                                                <span className="mr-2 text-yellow-500 text-sm">♦</span>
                                            )}
                                            <span className="text-gray-800 font-medium text-sm truncate">
                                                {task.milestoneName || task.name || 'Unnamed Task'}
                                            </span>
                                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                task.status === 'in progress' ? 'bg-yellow-100 text-yellow-800' :
                                                task.status === 'on hold' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        <div className="flex space-x-4 text-xs text-gray-500 mt-1">
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
                                            className="text-green-600 hover:text-green-800 text-xs"
                                        >
                                            edit
                                        </button>
                                        <button 
                                            onClick={() => confirmDelete(task.milestoneId)}
                                            className="text-red-600 hover:text-red-800 text-xs"
                                        >
                                            delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {phaseTasks.length === 0 && (
                                <div className="p-3 pl-12 text-gray-500 text-xs">
                                    No tasks in this phase yet.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                {Object.keys(groupedTasks).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No tasks or phases created yet. Click "Add Task" to get started.
                    </div>
                )}
            </div>
        );
    };

    // FIXED: Enhanced Gantt chart with full year and multi-year support
    const renderGanttChart = () => {
        const tasksWithDates = tasks.filter(task => 
            !task.isPhase && 
            task.startDate && 
            (task.endDate || task.targetDate) &&
            task.milestoneName
        );

        if (tasksWithDates.length === 0) {
            return (
                <div className="bg-gray-100 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-center mb-4 text-gray-700">Project Timeline - Gantt Chart</h3>
                    <div className="text-center py-8 text-gray-500">
                        No tasks to display in Gantt chart. Add some tasks with start and end dates first.
                    </div>
                </div>
            );
        }

        // FIXED: Calculate date range dynamically from actual task dates
        const allDates = tasksWithDates.flatMap(task => [
            new Date(task.startDate),
            new Date(task.endDate || task.targetDate)
        ]);
        
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        // Ensure we show full years and extend range if needed
        const startYear = minDate.getFullYear();
        const endYear = maxDate.getFullYear();
        
        const projectStartDate = new Date(startYear, 0, 1); // January 1st of start year
        const projectEndDate = new Date(endYear, 11, 31); // December 31st of end year
        
        // Generate month headers with years
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
            <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-center mb-4 text-gray-700">Project Timeline - Gantt Chart</h3>
                <div className="overflow-x-auto">
                    <div style={{ minWidth: `${Math.max(800, months.length * 60 + 200)}px` }}>
                        {/* Timeline Header - FIXED: Dynamic months with years */}
                        <div className="grid gap-0 mb-2" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
                            <div className="bg-teal-500 text-white text-center py-2 text-xs font-medium">Task</div>
                            {months.map((month, index) => (
                                <div key={index} className="bg-teal-500 text-white text-center py-2 text-xs font-medium border-r border-teal-400">
                                    <div>{month.name}</div>
                                    {(index === 0 || month.name === 'Jan') && (
                                        <div className="text-xs opacity-75">{month.year}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {/* Timeline Rows - FIXED: Proper date calculations and colors */}
                        {tasksWithDates.map((task) => {
                            const taskStart = new Date(task.startDate);
                            const taskEnd = new Date(task.endDate || task.targetDate);
                            
                            // Find which months this task spans
                            const taskMonths = months.map((month, index) => {
                                const monthStart = new Date(month.year, months.indexOf(month) % 12, 1);
                                const monthEnd = new Date(month.year, months.indexOf(month) % 12 + 1, 0);
                                
                                // Check if task overlaps with this month
                                const overlaps = taskStart <= monthEnd && taskEnd >= monthStart;
                                
                                if (!overlaps) return null;
                                
                                // Calculate how much of the month is covered
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
                            
                            // FIXED: Use parent phase color or default
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
                                            <div key={monthIndex} className="bg-gray-200 relative h-8 border-r border-gray-300">
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
                
                {/* Dynamic Phase Legend - FIXED: Show actual phase colors */}
                {phases.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-3 justify-center">
                        {phases.map(phase => (
                            <div key={phase.milestoneId} className="flex items-center">
                                <div 
                                    className="w-3 h-3 rounded mr-2"
                                    style={{ backgroundColor: phase.phaseColor }}
                                ></div>
                                <span className="text-xs text-gray-600">
                                    {phase.milestoneName || phase.name || 'Unnamed Phase'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Calculate statistics
    const totalTasks = tasks.filter(t => t.isPhase !== true).length;
    const totalPhases = phases.length;
    const completedTasks = tasks.filter(t => t.isPhase !== true && t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.isPhase !== true && t.status === 'in progress').length;
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
        <div className="bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold">Project Phases & Milestones</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                viewMode === 'table' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Table View
                        </button>
                        <button
                            onClick={() => setViewMode('gantt')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
                    className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700"
                >
                    Add Task
                </button>
            </div>

            {/* Summary Stats - FIXED: Compact layout */}
            <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-blue-600">Total Phases</div>
                    <div className="text-xl font-bold text-blue-800">{totalPhases}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-green-600">Total Tasks</div>
                    <div className="text-xl font-bold text-green-800">{totalTasks}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-yellow-600">Completed</div>
                    <div className="text-xl font-bold text-yellow-800">{completedTasks}</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-purple-600">In Progress</div>
                    <div className="text-xl font-bold text-purple-800">{inProgressTasks}</div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="text-xs font-medium text-indigo-600">Total Budget</div>
                    <div className="text-xl font-bold text-indigo-800">₱{formatCurrency(totalBudget)}</div>
                </div>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'table' ? renderHierarchicalView() : renderGanttChart()}

            {/* Enhanced Modal - FIXED: Better color picker UI */}
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
                            // Phase Form
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phase Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {phaseColors.map((color) => (
                                            <button
                                                key={color.value}
                                                type="button"
                                                onClick={() => setTaskForm({...taskForm, phaseColor: color.value})}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                    taskForm.phaseColor === color.value 
                                                        ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-400 scale-110' 
                                                        : 'border-gray-300 hover:scale-105'
                                                }`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600">
                                        Selected: <span 
                                            className="inline-block w-4 h-4 rounded-full mr-2 align-middle" 
                                            style={{ backgroundColor: taskForm.phaseColor }}
                                        ></span>
                                        {phaseColors.find(c => c.value === taskForm.phaseColor)?.name || 'Custom'}
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Planned Cost (PHP)</label>
                                    <input
                                        type="text"
                                        value={taskForm.plannedCost ? formatCurrency(taskForm.plannedCost) : ''}
                                        onChange={(e) => handleCostChange(e.target.value)}
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
                                            <option key={phase.milestoneId} value={phase.milestoneId}>
                                                {phase.milestoneName || phase.name || 'Unnamed Phase'}
                                            </option>
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
                                                <option key={status} value={status}>
                                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                                </option>
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
                                        type="text"
                                        value={taskForm.plannedCost ? formatCurrency(taskForm.plannedCost) : ''}
                                        onChange={(e) => handleCostChange(e.target.value)}
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