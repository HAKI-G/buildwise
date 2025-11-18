import React, { useState, useEffect, useMemo } from 'react';
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

const Milestones = ({ readonly, initialViewMode = 'table' }) => {
    const { projectId } = useParams();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [editingTask, setEditingTask] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [completingPhase, setCompletingPhase] = useState(null);
    const [phaseCompletionStatus, setPhaseCompletionStatus] = useState({});
    
    const [budgetWarning, setBudgetWarning] = useState(null); // For budget warning modal
    
    const [taskForm, setTaskForm] = useState({
        name: '',
        startDate: '',
        endDate: '',
        phase: '',
        phaseColor: '#3B82F6',
        parentPhaseId: '',
        status: 'not started',
        priority: 'Medium',
        estimatedCost: '',  // ✅ Changed from plannedCost
        resources: [],  // ✅ Changed to array for list items
        resourceInput: '', // ✅ New field for input
        isPhase: false,
        isMilestone: false
    });

    const priorities = ['High', 'Medium', 'Low'];
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
            
            // ✅ FIX: Map estimatedCost to internal state
            const mappedTasks = (response.data || []).map(task => {
                // Parse estimatedCost - handle both string and number formats
                let parsedCost = 0;
                if (task.estimatedCost !== undefined && task.estimatedCost !== null) {
                    const costStr = task.estimatedCost.toString().replace(/,/g, '');
                    parsedCost = parseFloat(costStr) || 0;
                }
                
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
                    phaseColor: task.phaseColor || '#3B82F6',
                    resources: Array.isArray(task.resourceRequirements) 
                        ? task.resourceRequirements 
                        : (task.resourceRequirements || task.resources || '').split('\n').filter(r => r.trim()),
                    resourceRequirements: task.resourceRequirements || task.resources || '',
                    isMilestone: task.isKeyMilestone || task.isMilestone || false,
                    isKeyMilestone: task.isKeyMilestone || task.isMilestone || false,
                    status: task.status || 'not started',
                    priority: task.priority || 'Medium',
                    estimatedCost: parsedCost,  // ✅ Use estimatedCost
                    isPhase: task.isPhase || false,
                    completedAt: task.completedAt || null
                };
            });
            
            // ✅ Debug log to verify the data
            console.log('🔍 RAW API Response:', response.data);
            console.log('📦 Mapped tasks:', mappedTasks.map(t => ({
                id: t.milestoneId,
                name: t.milestoneName,
                isPhase: t.isPhase,
                parentPhase: t.parentPhase,
                cost: t.estimatedCost,
                status: t.status
            })));
            
            // ✅ Check for orphaned tasks (tasks with deleted parent phases)
            const phases = mappedTasks.filter(t => t.isPhase === true);
            const phaseIds = new Set(phases.map(p => p.milestoneId));
            const orphanedTasks = mappedTasks.filter(t => 
                !t.isPhase && 
                t.parentPhase && 
                !phaseIds.has(t.parentPhase)
            );
            
            if (orphanedTasks.length > 0) {
                console.warn('⚠️ Found orphaned tasks (parent phase deleted):', orphanedTasks.map(t => ({
                    name: t.milestoneName,
                    parentPhase: t.parentPhase
                })));
                
                // Auto-delete orphaned tasks
                const token = getToken();
                const config = { headers: { Authorization: `Bearer ${token}` } };
                for (const orphan of orphanedTasks) {
                    try {
                        await axios.delete(`http://localhost:5001/api/milestones/${projectId}/${orphan.milestoneId}`, config);
                        console.log(`  ✅ Auto-deleted orphaned task: ${orphan.milestoneName}`);
                    } catch (err) {
                        console.error(`  ❌ Failed to delete orphaned task: ${orphan.milestoneName}`, err);
                    }
                }
                
                // Re-fetch after cleanup
                if (orphanedTasks.length > 0) {
                    const cleanResponse = await axios.get(`http://localhost:5001/api/milestones/project/${projectId}`, config);
                    const cleanMappedTasks = (cleanResponse.data || []).map(task => {
                        let parsedCost = 0;
                        if (task.estimatedCost !== undefined && task.estimatedCost !== null) {
                            const costStr = task.estimatedCost.toString().replace(/,/g, '');
                            parsedCost = parseFloat(costStr) || 0;
                        }
                        
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
                            phaseColor: task.phaseColor || '#3B82F6',
                            resources: task.resourceRequirements || task.resources || '',
                            resourceRequirements: task.resourceRequirements || task.resources || '',
                            isMilestone: task.isKeyMilestone || task.isMilestone || false,
                            isKeyMilestone: task.isKeyMilestone || task.isMilestone || false,
                            status: task.status || 'not started',
                            priority: task.priority || 'Medium',
                            estimatedCost: parsedCost,
                            isPhase: task.isPhase || false,
                            completedAt: task.completedAt || null
                        };
                    });
                    setTasks(cleanMappedTasks);
                    await checkAllPhasesCompletionStatus(cleanMappedTasks.filter(t => t.isPhase), config);
                    setError('');
                    setLoading(false);
                    return;
                }
            }
            
            // Clear tasks first, then set new data
            setTasks([]);
            setTimeout(() => {
                setTasks(mappedTasks);
            }, 0);
            
            await checkAllPhasesCompletionStatus(mappedTasks.filter(t => t.isPhase), config);
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

    const checkAllPhasesCompletionStatus = async (phasesList, config) => {
        const statusMap = {};
        
        for (const phase of phasesList) {
            try {
                const response = await axios.get(
                    `http://localhost:5001/api/milestones/${projectId}/phase/${phase.milestoneId}/can-complete`,
                    config
                );
                statusMap[phase.milestoneId] = response.data;
            } catch (err) {
                console.error(`Error checking phase ${phase.milestoneId}:`, err);
                statusMap[phase.milestoneId] = { canComplete: false, totalTasks: 0, completedTasks: 0 };
            }
        }
        
        setPhaseCompletionStatus(statusMap);
    };

    useEffect(() => {
        if (projectId) {
            fetchProjectTasks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleQuickCompleteTask = async (task) => {
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            const newStatus = task.status === "completed" ? "in progress" : "completed";
            const newCompletion = newStatus === "completed" ? 100 : (task.completionPercentage || 0);
            
            await axios.put(
                `http://localhost:5001/api/milestones/${projectId}/${task.milestoneId}`,
                { 
                    status: newStatus,
                    completionPercentage: newCompletion
                },
                config
            );

            console.log('✅ Task updated - Email should be sent');
            await fetchProjectTasks();
        } catch (err) {
            console.error("Error updating task:", err);
            alert("Failed to update task status");
        }
    };

    const handleCompletePhase = async (phaseId) => {
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        setCompletingPhase(phaseId);
        
        try {
            await axios.post(
                `http://localhost:5001/api/milestones/${projectId}/phase/${phaseId}/complete`,
                {},
                config
            );
            
            alert('✅ Phase completed successfully!');
            await fetchProjectTasks();
        } catch (err) {
            console.error('Error completing phase:', err);
            const errorMsg = err.response?.data?.message || 'Failed to complete phase';
            alert(`❌ ${errorMsg}`);
        } finally {
            setCompletingPhase(null);
        }
    };

    const openAddTaskModal = () => {
        setTaskForm({
            name: '',
            startDate: '',
            endDate: '',
            phase: '',
            phaseColor: '#3B82F6',
            parentPhaseId: '',
            status: 'not started',
            priority: 'Medium',
            estimatedCost: '',  // ✅ Changed
            resources: [],  // ✅ Changed to empty array
            resourceInput: '',  // ✅ Added
            isPhase: false,
            isMilestone: false
        });
        setEditingTask(null);
        setShowModal(true);
    };

    const openEditTaskModal = (task) => {
        // Convert resources to array if it's a string
        const resourcesArray = Array.isArray(task.resources)
            ? task.resources
            : Array.isArray(task.resourceRequirements)
                ? task.resourceRequirements
                : (task.resourceRequirements || task.resources || '').split('\n').filter(r => r.trim());
        
        setTaskForm({
            name: task.milestoneName || task.name || '',
            startDate: task.startDate || '',
            endDate: task.endDate || task.targetDate || '',
            phase: task.phase || '',
            phaseColor: task.phaseColor || '#3B82F6',
            parentPhaseId: task.parentPhase || task.parentPhaseId || '',
            status: task.status || 'not started',
            priority: task.priority || 'Medium',
            estimatedCost: task.estimatedCost || '',  // ✅ Changed
            resources: resourcesArray,  // ✅ Now an array
            resourceInput: '',  // ✅ Reset input
            isPhase: task.isPhase || false,
            isMilestone: task.isKeyMilestone || task.isMilestone || false
        });
        setEditingTask(task.milestoneId);
        setShowModal(true);
    };

    const handleCostChange = (value) => {
        const numericValue = parseCurrency(value);
        setTaskForm({...taskForm, estimatedCost: numericValue});  // ✅ Changed
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

        // ✅ Budget validation for tasks against parent phase
        if (!taskForm.isPhase && taskForm.parentPhaseId && taskForm.estimatedCost) {
            const parentPhase = phases.find(p => p.milestoneId === taskForm.parentPhaseId);
            if (parentPhase && parentPhase.estimatedCost) {
                const phaseBudget = parseFloat(parentPhase.estimatedCost) || 0;
                const siblingTasks = tasks.filter(t => 
                    !t.isPhase && 
                    t.parentPhase === taskForm.parentPhaseId &&
                    t.milestoneId !== editingTask // Exclude current task if editing
                );
                const totalSiblingCosts = siblingTasks.reduce((sum, t) => sum + (parseFloat(t.estimatedCost) || 0), 0);
                const newTaskCost = parseFloat(parseCurrency(taskForm.estimatedCost)) || 0;
                const totalPhaseCost = totalSiblingCosts + newTaskCost;
                
                if (totalPhaseCost > phaseBudget) {
                    const overbudget = totalPhaseCost - phaseBudget;
                    // Show custom modal instead of window.confirm
                    setBudgetWarning({
                        phaseBudget,
                        totalSiblingCosts,
                        newTaskCost,
                        totalPhaseCost,
                        overbudget
                    });
                    return;
                }
            }
        }

        await saveTaskData();
    };

    const saveTaskData = async () => {
        setIsSubmitting(true);
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };

        try {
            // ✅ Don't include projectId in the update body (it's a key attribute)
            const taskData = {
                milestoneName: taskForm.name.trim(),
                taskName: taskForm.name.trim(),
                startDate: taskForm.startDate,
                endDate: taskForm.endDate,
                targetDate: taskForm.endDate,
                parentPhase: taskForm.parentPhaseId || null,
                status: taskForm.status,
                priority: taskForm.priority,
                estimatedCost: parseFloat(parseCurrency(taskForm.estimatedCost)) || 0,  // ✅ Changed
                resourceRequirements: Array.isArray(taskForm.resources) ? taskForm.resources.join('\n') : taskForm.resources,  // ✅ Convert array to string
                isPhase: taskForm.isPhase,
                isKeyMilestone: taskForm.isMilestone,
                phaseColor: taskForm.phaseColor || '#3B82F6',
                description: Array.isArray(taskForm.resources) ? taskForm.resources.join('\n') : taskForm.resources,
                createdAt: editingTask ? undefined : new Date().toISOString()
            };

            // Only add projectId and createdAt for new tasks
            const createData = {
                projectId,
                ...taskData,
                createdAt: new Date().toISOString()
            };

            console.log('💾 Saving task:', { editingTask, data: editingTask ? taskData : createData });

            if (editingTask) {
                await axios.put(`http://localhost:5001/api/milestones/${projectId}/${editingTask}`, taskData, config);
                console.log('✅ Task updated successfully');
            } else {
                await axios.post(`http://localhost:5001/api/milestones/${projectId}`, createData, config);
                console.log('✅ Task created successfully');
            }

            setShowModal(false);
            await fetchProjectTasks();
        } catch (err) {
            console.error('❌ Error saving task:', err);
            console.error('Error details:', err.response?.data);
            alert(`Failed to save task: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBudgetWarningConfirm = async () => {
        setBudgetWarning(null);
        await saveTaskData();
    };

    const handleBudgetWarningCancel = () => {
        setBudgetWarning(null);
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
            const itemToDelete = tasks.find(t => t.milestoneId === taskToDelete);
            const isPhase = itemToDelete?.isPhase;
            
            console.log('🗑️ Deleting:', {
                id: taskToDelete,
                name: itemToDelete?.milestoneName,
                isPhase,
                hasChildren: isPhase ? tasks.filter(t => t.parentPhase === taskToDelete && !t.isPhase).length : 0
            });
            
            // If deleting a phase, also delete all child tasks
            if (isPhase) {
                const childTasks = tasks.filter(t => t.parentPhase === taskToDelete && !t.isPhase);
                
                console.log(`  → Deleting ${childTasks.length} child tasks first`);
                
                // Delete all child tasks first
                for (const childTask of childTasks) {
                    await axios.delete(`http://localhost:5001/api/milestones/${projectId}/${childTask.milestoneId}`, config);
                    console.log(`    ✅ Deleted child task: ${childTask.milestoneName}`);
                }
            }
            
            // Delete the phase/task itself
            await axios.delete(`http://localhost:5001/api/milestones/${projectId}/${taskToDelete}`, config);
            console.log(`  ✅ Deleted ${isPhase ? 'phase' : 'task'}: ${itemToDelete?.milestoneName}`);
            
            // Close modal and clear selection
            setShowDeleteConfirm(false);
            setTaskToDelete(null);
            
            // Force clear local state before refresh
            setTasks([]);
            
            // Refresh the tasks list from server
            await fetchProjectTasks();
            
            console.log('✅ Deletion complete and data refreshed');
        } catch (err) {
            console.error('❌ Error deleting task:', err);
            alert('Failed to delete task. Please try again.');
        }
    };

    const PriorityBadge = ({ priority }) => {
        const colors = {
            'High': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'Low': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[priority] || colors['Medium']}`}>
                {priority}
            </span>
        );
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
                {sortedGroups.map(({ phase, tasks: phaseTasks }) => {
                    const phaseStatus = phaseCompletionStatus[phase.milestoneId] || {};
                    const isPhaseCompleted = phase.status === 'completed';
                    
                    return (
                        <div key={phase.milestoneId} className={`border rounded-lg overflow-hidden ${
                            isPhaseCompleted 
                                ? 'border-green-500 dark:border-green-600' 
                                : phaseBudgetStatus[phase.milestoneId]?.isOverbudget
                                ? 'border-red-500 dark:border-red-600'
                                : 'border-gray-200 dark:border-slate-700'
                        }`}>
                            <div className="flex items-center p-3 border-l-4 bg-white dark:bg-slate-800" 
                                 style={{ borderLeftColor: phaseBudgetStatus[phase.milestoneId]?.isOverbudget ? '#EF4444' : phase.phaseColor }}>
                                <div className="w-6 h-3 mr-3 rounded" style={{ backgroundColor: phaseBudgetStatus[phase.milestoneId]?.isOverbudget ? '#EF4444' : phase.phaseColor }}></div>
                                
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold text-gray-900 dark:text-white">
                                            {phase.milestoneName || phase.name || 'Unnamed Phase'}
                                        </span>
                                        
                                        {isPhaseCompleted && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                Completed
                                            </span>
                                        )}
                                        
                                        {!isPhaseCompleted && phaseStatus.totalTasks > 0 && (
                                            <span className="text-xs text-gray-500 dark:text-slate-400">
                                                ({phaseStatus.completedTasks}/{phaseStatus.totalTasks} tasks)
                                            </span>
                                        )}
                                        
                                        {/* ✅ Overbudget indicator */}
                                        {phaseBudgetStatus[phase.milestoneId]?.isOverbudget && (
                                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded-full font-semibold">
                                                ⚠️ Over Budget: ₱{formatCurrency(phaseBudgetStatus[phase.milestoneId].overbudgetAmount)}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Phase budget info */}
                                    {phase.estimatedCost && (
                                        <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                            Phase Budget: ₱{formatCurrency(phase.estimatedCost)}
                                            {phaseBudgetStatus[phase.milestoneId] && (
                                                <span className={phaseBudgetStatus[phase.milestoneId].isOverbudget ? 'text-red-600 dark:text-red-400 ml-2' : 'ml-2'}>
                                                    | Tasks Total: ₱{formatCurrency(phaseBudgetStatus[phase.milestoneId].totalTasksCost)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="ml-auto flex items-center space-x-2">
                                    {phase.milestoneId !== 'unassigned' && !isPhaseCompleted && (
                                        <button
                                            onClick={() => handleCompletePhase(phase.milestoneId)}
                                            disabled={!phaseStatus.canComplete || completingPhase === phase.milestoneId}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                                phaseStatus.canComplete && completingPhase !== phase.milestoneId
                                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                                    : 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-slate-500 cursor-not-allowed'
                                            }`}
                                            title={
                                                phaseStatus.canComplete 
                                                    ? 'Complete this phase' 
                                                    : `Complete all ${phaseStatus.totalTasks} tasks first`
                                            }
                                        >
                                            {completingPhase === phase.milestoneId ? 'Completing...' : '✓ Complete Phase'}
                                        </button>
                                    )}
                                    
                                    {phase.milestoneId !== 'unassigned' && !readonly && (
                                        <>
                                            <button 
                                                onClick={() => openEditTaskModal(phase)}
                                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                                            >
                                                edit
                                            </button>
                                            <button 
                                                onClick={() => confirmDelete(phase.milestoneId)}
                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium"
                                            >
                                                delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-slate-900/50">
                                {phaseTasks.map((task) => {
                                    const isTaskCompleted = task.status === 'completed';
                                    const completionPct = task.completionPercentage || 0;
                                    
                                    return (
                                        <div key={task.milestoneId} className={`flex items-center p-2 pl-12 border-b border-gray-200 dark:border-slate-700 last:border-b-0 ${
                                            isTaskCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                                        }`}>
                                            <button
                                                onClick={() => handleQuickCompleteTask(task)}
                                                className={`mr-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                    isTaskCompleted
                                                        ? 'bg-green-600 border-green-600'
                                                        : 'border-gray-300 dark:border-slate-600 hover:border-green-500'
                                                }`}
                                                title={isTaskCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                                            >
                                                {isTaskCompleted && (
                                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                            
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {task.isKeyMilestone && (
                                                        <span className="mr-2 text-yellow-500 text-sm">♦</span>
                                                    )}
                                                    <span className={`text-sm font-medium truncate ${
                                                        isTaskCompleted 
                                                            ? 'text-gray-500 dark:text-slate-500 line-through' 
                                                            : 'text-gray-800 dark:text-white'
                                                    }`}>
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
                                                    
                                                    {/* ✅ SHOW COMPLETION PERCENTAGE */}
                                                    {completionPct > 0 && (
                                                        <span className={`ml-1 inline-flex px-2 py-1 text-xs font-semibold rounded ${
                                                            completionPct >= 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                                            completionPct >= 50 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
                                                        }`}>
                                                            {completionPct}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex space-x-4 text-xs text-gray-500 dark:text-slate-400 mt-1">
                                                    {task.priority && (
                                                        <span className="flex items-center gap-1">
                                                            Priority: <PriorityBadge priority={task.priority} />
                                                        </span>
                                                    )}
                                                    {task.endDate && (
                                                        <span>Due: {new Date(task.endDate).toLocaleDateString()}</span>
                                                    )}
                                                    {task.estimatedCost > 0 && (
                                                        <span>Cost: ₱{formatCurrency(task.estimatedCost)}</span>
                                                    )}
                                                    {task.completedAt && (
                                                        <span className="text-green-600 dark:text-green-400">
                                                            ✓ {new Date(task.completedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* ✅ PROGRESS BAR for non-completed tasks */}
                                                {!isTaskCompleted && completionPct > 0 && (
                                                    <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                                                        <div 
                                                            className={`h-1.5 rounded-full transition-all ${
                                                                completionPct >= 75 ? 'bg-green-500' :
                                                                completionPct >= 50 ? 'bg-blue-500' :
                                                                'bg-yellow-500'
                                                            }`}
                                                            style={{ width: `${completionPct}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            {!readonly && (
                                                <div className="flex space-x-2 ml-2">
                                                    <button 
                                                        onClick={() => openEditTaskModal(task)}
                                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs font-medium"
                                                    >
                                                        edit
                                                    </button>
                                                    <button 
                                                        onClick={() => confirmDelete(task.milestoneId)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs font-medium"
                                                    >
                                                        delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {phaseTasks.length === 0 && (
                                    <div className="p-3 pl-12 text-gray-500 dark:text-slate-400 text-xs italic">
                                        No tasks in this phase yet. Click "Add Task" and assign it to this phase.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {Object.keys(groupedTasks).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                        <p className="text-lg mb-2">No tasks or phases created yet.</p>
                        <p className="text-sm">Click "Add Task" to get started, or check "This is a Phase" to create a phase first.</p>
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

    // ✅ Calculate phase budget status (overbudget detection)
    const phaseBudgetStatus = useMemo(() => {
        const statusMap = {};
        phases.forEach(phase => {
            const phaseBudget = parseFloat(phase.estimatedCost) || 0;
            const phaseTasks = tasks.filter(t => !t.isPhase && t.parentPhase === phase.milestoneId);
            const totalTasksCost = phaseTasks.reduce((sum, t) => sum + (parseFloat(t.estimatedCost) || 0), 0);
            const isOverbudget = totalTasksCost > phaseBudget && phaseBudget > 0;
            const overbudgetAmount = isOverbudget ? totalTasksCost - phaseBudget : 0;
            
            statusMap[phase.milestoneId] = {
                phaseBudget,
                totalTasksCost,
                isOverbudget,
                overbudgetAmount
            };
        });
        return statusMap;
    }, [tasks, phases]);

    // ✅ FIXED: Total budget now sums ONLY phase costs, not individual tasks
    const stats = useMemo(() => {
        // Ensure we're working with fresh data
        const actualTasks = tasks.filter(t => t.isPhase !== true);
        const totalTasks = actualTasks.length;
        const totalPhases = phases.length;
        const completedTasks = actualTasks.filter(t => t.status === 'completed').length;
        const inProgressTasks = actualTasks.filter(t => t.status === 'in progress').length;
        
        // ✅ Sum only PHASE budgets
        const totalBudget = phases.reduce((sum, phase) => {
            const cost = parseFloat(phase.estimatedCost) || 0;
            return sum + cost;
        }, 0);
        
        // Count overbudget phases
        const overbudgetPhases = Object.values(phaseBudgetStatus).filter(p => p.isOverbudget).length;

        // Debug logging with more detail
        console.log('📊 Stats Calculation:', {
            totalItems: tasks.length,
            phasesData: phases.map(p => ({ 
                id: p.milestoneId,
                name: p.milestoneName, 
                isPhase: p.isPhase,
                cost: p.estimatedCost 
            })),
            tasksData: actualTasks.map(t => ({ 
                id: t.milestoneId,
                name: t.milestoneName, 
                isPhase: t.isPhase,
                parentPhase: t.parentPhase,
                status: t.status
            })),
            totalBudget,
            totalTasks,
            totalPhases,
            overbudgetPhases
        });

        return {
            totalTasks,
            totalPhases,
            completedTasks,
            inProgressTasks,
            totalBudget,
            overbudgetPhases
        };
    }, [tasks, phases, phaseBudgetStatus]);

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
                    disabled={readonly}
                    className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                    title={readonly ? "Project is completed - cannot add tasks" : "Add new task"}
                >
                    Add Task
                </button>
            </div>
            {readonly && (
                <span className="text-sm text-yellow-600 dark:text-yellow-400 ml-3">
                    ⛔ Project completed - editing disabled
                </span>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Phases</div>
                    <div className="text-xl font-bold text-blue-800 dark:text-blue-300">{stats.totalPhases}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-green-600 dark:text-green-400">Total Tasks</div>
                    <div className="text-xl font-bold text-green-800 dark:text-green-300">{stats.totalTasks}</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-yellow-600 dark:text-yellow-400">Completed</div>
                    <div className="text-xl font-bold text-yellow-800 dark:text-yellow-300">{stats.completedTasks}</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                    <div className="text-xs font-medium text-purple-600 dark:text-purple-400">In Progress</div>
                    <div className="text-xl font-bold text-purple-800 dark:text-purple-300">{stats.inProgressTasks}</div>
                </div>
                <div className={`p-3 rounded-lg ${
                    stats.overbudgetPhases > 0 
                        ? 'bg-red-50 dark:bg-red-900/20' 
                        : 'bg-indigo-50 dark:bg-indigo-900/20'
                }`}>
                    <div className={`text-xs font-medium ${
                        stats.overbudgetPhases > 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-indigo-600 dark:text-indigo-400'
                    }`}>
                        Total Budget (Phases Only)
                        {stats.overbudgetPhases > 0 && (
                            <span className="ml-1">⚠️ {stats.overbudgetPhases} Over</span>
                        )}
                    </div>
                    <div className={`text-xl font-bold ${
                        stats.overbudgetPhases > 0 
                            ? 'text-red-800 dark:text-red-300' 
                            : 'text-indigo-800 dark:text-indigo-300'
                    }`}>₱{formatCurrency(stats.totalBudget)}</div>
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Phase Cost (PHP)</label>
                                    <input
                                        type="text"
                                        value={taskForm.estimatedCost ? formatCurrency(taskForm.estimatedCost) : ''}
                                        onChange={(e) => handleCostChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                                        This is the total budget allocated for this phase
                                    </p>
                                </div>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Resource Requirements</label>
                                    <div className="space-y-2">
                                        {taskForm.resources.map((resource, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={resource}
                                                    onChange={(e) => {
                                                        const updated = [...taskForm.resources];
                                                        updated[index] = e.target.value;
                                                        setTaskForm({...taskForm, resources: updated});
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g., Cement, Round Metal, etc."
                                                />
                                                <button
                                                    onClick={() => {
                                                        const updated = taskForm.resources.filter((_, i) => i !== index);
                                                        setTaskForm({...taskForm, resources: updated});
                                                    }}
                                                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={taskForm.resourceInput}
                                                onChange={(e) => setTaskForm({...taskForm, resourceInput: e.target.value})}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && taskForm.resourceInput.trim()) {
                                                        setTaskForm({
                                                            ...taskForm,
                                                            resources: [...taskForm.resources, taskForm.resourceInput.trim()],
                                                            resourceInput: ''
                                                        });
                                                    }
                                                }}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Add a resource and press Enter..."
                                            />
                                            <button
                                                onClick={() => {
                                                    if (taskForm.resourceInput.trim()) {
                                                        setTaskForm({
                                                            ...taskForm,
                                                            resources: [...taskForm.resources, taskForm.resourceInput.trim()],
                                                            resourceInput: ''
                                                        });
                                                    }
                                                }}
                                                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
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
                                            min={taskForm.startDate}
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Task Priority</label>
                                        <select
                                            value={taskForm.priority}
                                            onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {priorities.map(priority => (
                                                <option key={priority} value={priority}>{priority}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Estimated Cost (PHP)</label>
                                    <input
                                        type="text"
                                        value={taskForm.estimatedCost ? formatCurrency(taskForm.estimatedCost) : ''}
                                        onChange={(e) => handleCostChange(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0"
                                    />
                                    {taskForm.parentPhaseId && (() => {
                                        const parentPhase = phases.find(p => p.milestoneId === taskForm.parentPhaseId);
                                        if (parentPhase?.estimatedCost) {
                                            const phaseBudget = parseFloat(parentPhase.estimatedCost) || 0;
                                            const siblingTasks = tasks.filter(t => 
                                                !t.isPhase && 
                                                t.parentPhase === taskForm.parentPhaseId &&
                                                t.milestoneId !== editingTask
                                            );
                                            const totalSiblingCosts = siblingTasks.reduce((sum, t) => sum + (parseFloat(t.estimatedCost) || 0), 0);
                                            const currentTaskCost = parseFloat(parseCurrency(taskForm.estimatedCost)) || 0;
                                            const totalPhaseCost = totalSiblingCosts + currentTaskCost;
                                            const remaining = phaseBudget - totalPhaseCost;
                                            
                                            return (
                                                <p className={`mt-1 text-xs ${remaining < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-slate-400'}`}>
                                                    Phase Budget: ₱{formatCurrency(phaseBudget)} | 
                                                    Used: ₱{formatCurrency(totalPhaseCost)} | 
                                                    {remaining >= 0 ? `Remaining: ₱${formatCurrency(remaining)}` : `⚠️ Over: ₱${formatCurrency(Math.abs(remaining))}`}
                                                </p>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Resource Requirements</label>
                                    <div className="space-y-2">
                                        {taskForm.resources.map((resource, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={resource}
                                                    onChange={(e) => {
                                                        const updated = [...taskForm.resources];
                                                        updated[index] = e.target.value;
                                                        setTaskForm({...taskForm, resources: updated});
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="e.g., Cement, Round Metal, etc."
                                                />
                                                <button
                                                    onClick={() => {
                                                        const updated = taskForm.resources.filter((_, i) => i !== index);
                                                        setTaskForm({...taskForm, resources: updated});
                                                    }}
                                                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={taskForm.resourceInput}
                                                onChange={(e) => setTaskForm({...taskForm, resourceInput: e.target.value})}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter' && taskForm.resourceInput.trim()) {
                                                        setTaskForm({
                                                            ...taskForm,
                                                            resources: [...taskForm.resources, taskForm.resourceInput.trim()],
                                                            resourceInput: ''
                                                        });
                                                    }
                                                }}
                                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Add a resource and press Enter..."
                                            />
                                            <button
                                                onClick={() => {
                                                    if (taskForm.resourceInput.trim()) {
                                                        setTaskForm({
                                                            ...taskForm,
                                                            resources: [...taskForm.resources, taskForm.resourceInput.trim()],
                                                            resourceInput: ''
                                                        });
                                                    }
                                                }}
                                                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
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

            {/* Budget Warning Modal */}
            {budgetWarning && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex items-center mb-4">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
                                <span className="text-red-600 dark:text-red-400 text-xl">⚠</span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">BUDGET WARNING</h3>
                        </div>
                        
                        <div className="mb-6 space-y-2 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-slate-400">Phase Budget:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">₱{formatCurrency(budgetWarning.phaseBudget)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-slate-400">Current Tasks Total:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">₱{formatCurrency(budgetWarning.totalSiblingCosts)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-slate-400">This Task:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">₱{formatCurrency(budgetWarning.newTaskCost)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                                <span className="text-gray-600 dark:text-slate-400">New Total:</span>
                                <span className="font-semibold text-gray-900 dark:text-white">₱{formatCurrency(budgetWarning.totalPhaseCost)}</span>
                            </div>
                            <div className="flex justify-between py-2 bg-red-50 dark:bg-red-900/20 rounded px-3">
                                <span className="text-red-600 dark:text-red-400 font-semibold">Overbudget:</span>
                                <span className="font-bold text-red-600 dark:text-red-400">₱{formatCurrency(budgetWarning.overbudget)}</span>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-slate-400 mb-6 text-sm">
                            This will exceed the phase budget. Do you want to continue?
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleBudgetWarningCancel}
                                className="px-4 py-2 text-gray-600 dark:text-slate-300 bg-gray-200 dark:bg-slate-700 rounded-md hover:bg-gray-300 dark:hover:bg-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBudgetWarningConfirm}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                OK
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
