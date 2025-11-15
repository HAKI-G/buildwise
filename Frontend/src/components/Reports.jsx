import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = ({ projectId }) => {
    const [pendingPhotos, setPendingPhotos] = useState([]);
    const [confirmedPhotos, setConfirmedPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userPercentage, setUserPercentage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taskCompletions, setTaskCompletions] = useState({}); // ✅ Store task averages
    const [phaseCompletions, setPhaseCompletions] = useState({}); // ✅ FIX: Add missing state
    
    const API_URL = 'http://localhost:5001/api';

    // ✅ GET AUTH TOKEN
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    useEffect(() => {
        if (projectId) {
            loadPhotos();
        }
    }, [projectId]);

    // ✅ NEW: Calculate task averages from confirmed photos
    const calculateTaskAverages = (confirmedPhotos) => {
        const taskGroups = {};
        
        confirmedPhotos.forEach(photo => {
            if (!photo.taskId || !photo.userInputPercentage) return;
            
            if (!taskGroups[photo.taskId]) {
                taskGroups[photo.taskId] = {
                    taskName: photo.taskName || 'Unknown Task',
                    percentages: [],
                    photoCount: 0
                };
            }
            
            taskGroups[photo.taskId].percentages.push(photo.userInputPercentage);
            taskGroups[photo.taskId].photoCount++;
        });
        
        // Calculate averages
        const averages = {};
        Object.keys(taskGroups).forEach(taskId => {
            const percentages = taskGroups[taskId].percentages;
            const avg = Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length);
            averages[taskId] = {
                ...taskGroups[taskId],
                average: avg
            };
        });
        
        return averages;
    };

    const calculatePhaseAverages = (confirmedPhotos, milestones) => {
        const phaseGroups = {};
        
        // Group photos by phase
        confirmedPhotos.forEach(photo => {
            if (!photo.phaseId || !photo.userInputPercentage) return;
            
            if (!phaseGroups[photo.phaseId]) {
                phaseGroups[photo.phaseId] = {
                    phaseName: photo.phaseName || 'Unknown Phase',
                    taskCompletions: {},
                    totalPhotos: 0
                };
            }
            
            // Group by task within phase
            if (!phaseGroups[photo.phaseId].taskCompletions[photo.taskId]) {
                phaseGroups[photo.phaseId].taskCompletions[photo.taskId] = {
                    taskName: photo.taskName || 'Unknown Task',
                    percentages: [],
                    photoCount: 0
                };
            }
            
            phaseGroups[photo.phaseId].taskCompletions[photo.taskId].percentages.push(photo.userInputPercentage);
            phaseGroups[photo.phaseId].taskCompletions[photo.taskId].photoCount++;
            phaseGroups[photo.phaseId].totalPhotos++;
        });
        
        // Calculate phase averages
        const phaseAverages = {};
        Object.keys(phaseGroups).forEach(phaseId => {
            const phase = phaseGroups[phaseId];
            const taskAverages = [];
            
            // Calculate average for each task in this phase
            Object.keys(phase.taskCompletions).forEach(taskId => {
                const task = phase.taskCompletions[taskId];
                const taskAvg = Math.round(
                    task.percentages.reduce((sum, p) => sum + p, 0) / task.percentages.length
                );
                taskAverages.push(taskAvg);
            });
            
            // Calculate phase average from task averages
            const phaseAvg = taskAverages.length > 0
                ? Math.round(taskAverages.reduce((sum, avg) => sum + avg, 0) / taskAverages.length)
                : 0;
            
            phaseAverages[phaseId] = {
                phaseName: phase.phaseName,
                average: phaseAvg,
                taskCount: Object.keys(phase.taskCompletions).length,
                photoCount: phase.totalPhotos
            };
        });
        
        return phaseAverages;
    };

    // ✅ UPDATED: Load photos and calculate averages
    const loadPhotos = async () => {
        if (!projectId) return;

        setLoading(true);
        try {
            console.log('🔄 Loading photos for project:', projectId);
            
            // Fetch photos
            const photosResponse = await axios.get(
                `${API_URL}/photos/project/${projectId}`,
                { headers: getAuthHeaders() }
            );
            
            // Fetch milestones to get phase information
            const milestonesResponse = await axios.get(
                `${API_URL}/milestones/project/${projectId}`,
                { headers: getAuthHeaders() }
            );
            
            const photos = photosResponse.data || [];
            const milestones = milestonesResponse.data || [];

            const pending = photos.filter(p => p.confirmationStatus === 'pending' && p.aiProcessed);
            const confirmed = photos.filter(p => p.confirmationStatus === 'confirmed');

            setPendingPhotos(pending);
            setConfirmedPhotos(confirmed);
            
            // ✅ Calculate both task and phase averages
            const taskAvgs = calculateTaskAverages(confirmed);
            setTaskCompletions(taskAvgs);
            
            const phaseAvgs = calculatePhaseAverages(confirmed, milestones);
            setPhaseCompletions(phaseAvgs);
            
            console.log(`✅ Loaded ${pending.length} pending and ${confirmed.length} confirmed photos`);
            console.log('📊 Task averages:', taskAvgs);
            console.log('📊 Phase averages:', phaseAvgs);
        } catch (error) {
            console.error('❌ Error loading photos:', error);
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const openConfirmModal = (photo) => {
        setSelectedPhoto(photo);
        setUserPercentage(photo.aiSuggestion?.ai_estimated_completion || '');
        setShowConfirmModal(true);
    };

    // ✅ UPDATED: Confirm with taskId and projectId
    const handleConfirm = async (confirmed) => {
        if (!selectedPhoto) return;

        if (confirmed && (!userPercentage || userPercentage <= 0 || userPercentage > 100)) {
            alert('Please enter a valid percentage between 1 and 100');
            return;
        }

        setIsSubmitting(true);

        try {
            const milestoneToConfirm = selectedPhoto.userSelectedMilestone || selectedPhoto.aiSuggestion?.milestone || 'Unknown';
            
            console.log('📤 Confirming photo:', {
                photoId: selectedPhoto.photoId,
                milestone: milestoneToConfirm,
                percentage: userPercentage,
                taskId: selectedPhoto.taskId,
                taskName: selectedPhoto.taskName,
                projectId: selectedPhoto.projectId
            });

            // ✅ Send confirmation with task and project IDs
            await axios.post(
                `${API_URL}/photos/${selectedPhoto.photoId}/confirm`,
                {
                    updateId: selectedPhoto.updateId,
                    milestone: milestoneToConfirm,
                    userPercentage: parseInt(userPercentage),
                    confirmed: confirmed,
                    taskId: selectedPhoto.taskId,        // ✅ Links photo to task
                    projectId: selectedPhoto.projectId   // ✅ Links photo to project
                },
                { headers: getAuthHeaders() }
            );

            if (confirmed) {
                alert(
                    `✅ Progress confirmed successfully!\n\n` +
                    `Task: ${selectedPhoto.taskName || 'Unknown'}\n` +
                    `Completion: ${userPercentage}%\n\n` +
                    `The task's completion percentage has been updated.`
                );
            } else {
                alert('Photo rejected');
            }

            setShowConfirmModal(false);
            setSelectedPhoto(null);
            setUserPercentage('');
            await loadPhotos();
        } catch (error) {
            console.error('❌ Error confirming photo:', error);
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
            } else {
                const errorMsg = error.response?.data?.message || error.message;
                alert(`❌ Failed to save confirmation: ${errorMsg}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getConfidenceBadge = (confidence) => {
        const colors = {
            high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            low: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        };
        return colors[confidence] || colors.low;
    };

    // ✅ NEW: Calculate overall average from phase averages
    const calculateOverallProgress = () => {
        const phaseAvgs = Object.values(phaseCompletions);
        if (phaseAvgs.length === 0) return 0;
        
        const totalAvg = phaseAvgs.reduce((sum, phase) => sum + phase.average, 0);
        return Math.round(totalAvg / phaseAvgs.length);
    };

    const renderPendingPhotos = () => {
        if (pendingPhotos.length === 0) {
            return (
                <div className="text-center py-16 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
                    <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">All caught up!</h3>
                    <p className="text-gray-500 dark:text-slate-400">No pending photos require your review</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingPhotos.map((photo) => (
                    <div key={photo.photoId} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        {/* Photo */}
                        <div className="relative">
                            <img 
                                src={photo.fileURL} 
                                alt={photo.caption}
                                className="w-full h-64 object-cover"
                            />
                            <div className="absolute top-3 right-3">
                                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                    Pending Review
                                </span>
                            </div>
                        </div>

                        {/* AI Analysis */}
                        <div className="p-6">
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-slate-400 mb-2">Photo Details</h3>
                                <p className="text-gray-900 dark:text-white font-medium">{photo.caption || 'No caption'}</p>
                                <p className="text-sm text-gray-500 dark:text-slate-400">
                                    Uploaded: {new Date(photo.uploadedAt).toLocaleString()}
                                </p>
                                {/* ✅ Show task name */}
                                {photo.taskName && (
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                        📋 Task: {photo.taskName}
                                    </p>
                                )}
                            </div>

                            {/* AI Suggestion */}
                            {photo.aiSuggestion && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center">
                                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                                </svg>
                                                AI Analysis
                                            </h4>
                                            <p className="text-lg font-bold text-blue-800 dark:text-blue-200 mt-1">
                                                {photo.aiSuggestion.milestone || 'Unknown'}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceBadge(photo.aiSuggestion.confidence)}`}>
                                            {photo.aiSuggestion.confidence || 'low'} confidence
                                        </span>
                                    </div>
                                    {photo.aiSuggestion.reason && (
                                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">
                                            <span className="font-medium">Reason:</span> {photo.aiSuggestion.reason}
                                        </p>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-slate-400">
                                            AI Estimated: <span className="font-bold">{photo.aiSuggestion.ai_estimated_completion || 0}%</span>
                                        </span>
                                        <span className="text-gray-600 dark:text-slate-400">
                                            Objects: <span className="font-bold">{photo.totalObjects || 0}</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={() => openConfirmModal(photo)}
                                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Review & Confirm Progress
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ✅ UPDATED: Confirmed photos show task average
    const renderConfirmedPhotos = () => {
        if (confirmedPhotos.length === 0) {
            return (
                <div className="text-center py-16 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
                    <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No confirmed reports yet</h3>
                    <p className="text-gray-500 dark:text-slate-400">Confirmed progress reports will appear here</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {confirmedPhotos.map((photo) => {
                    // ✅ Get task average completion
                    const taskInfo = taskCompletions[photo.taskId];
                    
                    return (
                        <div key={photo.photoId} className="bg-white dark:bg-slate-800 rounded-lg border border-green-200 dark:border-green-900 shadow-sm overflow-hidden">
                            <div className="relative">
                                <img 
                                    src={photo.fileURL} 
                                    alt={photo.caption}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute top-3 right-3">
                                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        Confirmed
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="mb-3">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                                        {photo.caption || 'No caption'}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        Confirmed: {new Date(photo.confirmedAt).toLocaleString()}
                                    </p>
                                </div>

                                <div className="space-y-2 text-sm">
                                    {/* ✅ Show Task Name */}
                                    <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-slate-700">
                                        <span className="text-gray-600 dark:text-slate-400">Task</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            {photo.taskName || 'Unknown'}
                                        </span>
                                    </div>
                                    
                                    {/* ✅ Show this photo's contribution */}
                                    <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-slate-700">
                                        <span className="text-gray-600 dark:text-slate-400">This Photo</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">
                                            {photo.userInputPercentage || 0}%
                                        </span>
                                    </div>
                                    
                                    {/* ✅ IMPORTANT: Show TASK AVERAGE completion */}
                                    {taskInfo && (
                                        <div className="flex justify-between items-center py-2 border-t-2 border-gray-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 -mx-5 px-5 mt-3">
                                            <div>
                                                <span className="text-green-700 dark:text-green-300 font-medium block">Task Average</span>
                                                <span className="text-xs text-green-600 dark:text-green-400">
                                                    From {taskInfo.photoCount} {taskInfo.photoCount === 1 ? 'photo' : 'photos'}
                                                </span>
                                            </div>
                                            <span className="font-bold text-green-700 dark:text-green-300 text-xl">
                                                {taskInfo.average}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (!projectId) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg">
                <p className="text-gray-500 dark:text-slate-400">No project selected.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Progress Reports</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                Review AI-analyzed photos and confirm progress milestones
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{pendingPhotos.length}</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">Pending</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 dark:text-green-400">{confirmedPhotos.length}</div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">Confirmed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                    {calculateOverallProgress()}%
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">Avg Progress (Phase-Based)</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'pending'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                    >
                        Pending Review ({pendingPhotos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('confirmed')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'confirmed'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                    >
                        Confirmed Reports ({confirmedPhotos.length})
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {loading ? (
                    <div className="flex justify-center items-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    activeTab === 'pending' ? renderPendingPhotos() : renderConfirmedPhotos()
                )}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && selectedPhoto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Progress</h3>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                disabled={isSubmitting}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 py-4">
                            {/* Photo Preview */}
                            <div className="mb-6">
                                <img 
                                    src={selectedPhoto.fileURL} 
                                    alt={selectedPhoto.caption}
                                    className="w-full h-64 object-cover rounded-lg"
                                />
                            </div>

                            {/* ✅ Show Task Name */}
                            {selectedPhoto.taskName && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 border-2 border-blue-200 dark:border-blue-700">
                                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                        </svg>
                                        Task
                                    </h4>
                                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                                        {selectedPhoto.taskName}
                                    </p>
                                </div>
                            )}

                            {/* AI Suggestion */}
                            {selectedPhoto.aiSuggestion && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6 border-2 border-green-200 dark:border-green-700">
                                    <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">
                                        🤖 AI Analysis
                                    </h4>
                                    <p className="text-lg font-bold text-green-800 dark:text-green-200 mb-2">
                                        {selectedPhoto.aiSuggestion.milestone || 'Unknown'}
                                    </p>
                                    {selectedPhoto.aiSuggestion.reason && (
                                        <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">
                                            {selectedPhoto.aiSuggestion.reason}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-600 dark:text-slate-400">
                                        AI Estimated: <span className="font-bold text-green-700 dark:text-green-300">{selectedPhoto.aiSuggestion.ai_estimated_completion || 0}%</span>
                                    </p>
                                </div>
                            )}

                            {/* User Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    What percentage is this task complete? (1-100)
                                </label>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                                    You can adjust the AI's suggestion based on your expert assessment
                                </p>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={userPercentage}
                                        onChange={(e) => setUserPercentage(e.target.value)}
                                        className="w-full px-4 py-3 text-2xl font-bold text-center border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="75"
                                    />
                                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-gray-400 dark:text-slate-500">%</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                                    This will update the task's overall completion percentage
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl">
                            <button
                                onClick={() => handleConfirm(false)}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400"></div>
                                        Rejecting...
                                    </>
                                ) : (
                                    'Reject'
                                )}
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                disabled={isSubmitting || !userPercentage || userPercentage <= 0 || userPercentage > 100}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Confirm Progress
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;