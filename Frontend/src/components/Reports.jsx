import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = ({ projectId }) => { // ✅ ADD projectId prop
    const [pendingPhotos, setPendingPhotos] = useState([]);
    const [confirmedPhotos, setConfirmedPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userPercentage, setUserPercentage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const API_URL = 'http://localhost:5001/api';

    // Milestone weights
    const MILESTONE_WEIGHTS = {
        'Foundation': 15,
        'Structural Frame': 30,
        'Roofing': 15,
        'Walls & Finishing': 25,
        'MEP Systems': 15
    };

    // ✅ Load photos when projectId changes
    useEffect(() => {
        if (projectId) {
            loadPhotos();
        }
    }, [projectId]);

    // ✅ Load photos for THIS project only
    const loadPhotos = async () => {
        if (!projectId) return;

        setLoading(true);
        try {
            // ✅ Get photos for this specific project
            const response = await axios.get(`${API_URL}/photos/project/${projectId}`);
            const photos = response.data || [];

            // Separate pending and confirmed
            const pending = photos.filter(p => p.confirmationStatus === 'pending' && p.aiProcessed);
            const confirmed = photos.filter(p => p.confirmationStatus === 'confirmed');

            setPendingPhotos(pending);
            setConfirmedPhotos(confirmed);
            
            console.log(`✅ Loaded ${pending.length} pending and ${confirmed.length} confirmed photos for project ${projectId}`);
        } catch (error) {
            console.error('Error loading photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const openConfirmModal = (photo) => {
        setSelectedPhoto(photo);
        setUserPercentage(photo.aiSuggestion?.ai_estimated_completion || '');
        setShowConfirmModal(true);
    };

    const handleConfirm = async (confirmed) => {
        if (!selectedPhoto) return;

        if (confirmed && (!userPercentage || userPercentage <= 0 || userPercentage > 100)) {
            alert('Please enter a valid percentage between 1 and 100');
            return;
        }

        setIsSubmitting(true);

        try {
            // ✅ Use user-selected milestone if available, fallback to AI suggestion
            const milestoneToConfirm = selectedPhoto.userSelectedMilestone || selectedPhoto.aiSuggestion.milestone;
            
            await axios.post(`${API_URL}/photos/${selectedPhoto.photoId}/confirm`, {
                updateId: selectedPhoto.updateId,
                milestone: milestoneToConfirm,  // ✅ Send user's selection
                userPercentage: parseInt(userPercentage),
                confirmed: confirmed
            });

            alert(confirmed ? 'Progress confirmed successfully!' : 'Photo rejected');
            setShowConfirmModal(false);
            setSelectedPhoto(null);
            setUserPercentage('');
            await loadPhotos(); // Reload photos
        } catch (error) {
            console.error('Error confirming photo:', error);
            alert('Failed to save confirmation. Please try again.');
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
                            </div>

                            {/* User Selected Milestone */}
                            {photo.userSelectedMilestone && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-4 border-2 border-green-200 dark:border-green-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                        </svg>
                                        <h4 className="font-semibold text-green-900 dark:text-green-300">
                                            User Selected Milestone
                                        </h4>
                                    </div>
                                    <p className="text-2xl font-bold text-green-800 dark:text-green-200 ml-7">
                                        {photo.userSelectedMilestone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </p>
                                </div>
                            )}

                            {/* AI Suggestion */}
                            {photo.aiSuggestion && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center">
                                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                                </svg>
                                                AI Detected Milestone
                                            </h4>
                                            <p className="text-lg font-bold text-blue-800 dark:text-blue-200 mt-1">
                                                {photo.aiSuggestion.milestone}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceBadge(photo.aiSuggestion.confidence)}`}>
                                            {photo.aiSuggestion.confidence} confidence
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-2">
                                        <span className="font-medium">Reason:</span> {photo.aiSuggestion.reason}
                                    </p>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-slate-400">
                                            AI Estimated: <span className="font-bold">{photo.aiSuggestion.ai_estimated_completion}%</span>
                                        </span>
                                        <span className="text-gray-600 dark:text-slate-400">
                                            Objects: <span className="font-bold">{photo.totalObjects || 0}</span>
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Match Indicator */}
                            {photo.userSelectedMilestone && photo.aiSuggestion && (
                                <div className={`rounded-lg p-3 mb-4 ${
                                    photo.userSelectedMilestone.toLowerCase().replace(/_/g, ' ') === photo.aiSuggestion.milestone.toLowerCase().replace(/_/g, ' ')
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                                        : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700'
                                }`}>
                                    <p className={`text-sm font-semibold ${
                                        photo.userSelectedMilestone.toLowerCase().replace(/_/g, ' ') === photo.aiSuggestion.milestone.toLowerCase().replace(/_/g, ' ')
                                            ? 'text-green-800 dark:text-green-300'
                                            : 'text-yellow-800 dark:text-yellow-300'
                                    }`}>
                                        {photo.userSelectedMilestone.toLowerCase().replace(/_/g, ' ') === photo.aiSuggestion.milestone.toLowerCase().replace(/_/g, ' ')
                                            ? '✅ User and AI selections match!'
                                            : '⚠️ User and AI selections differ - please review'}
                                    </p>
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
                {confirmedPhotos.map((photo) => (
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
                                <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-slate-700">
                                    <span className="text-gray-600 dark:text-slate-400">Milestone</span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {photo.userConfirmedMilestone}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-slate-700">
                                    <span className="text-gray-600 dark:text-slate-400">Completion</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">
                                        {photo.userInputPercentage}%
                                    </span>
                                </div>
                                {photo.overallProgressPercent && (
                                    <div className="flex justify-between items-center py-2 border-t border-gray-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 -mx-5 px-5 mt-3">
                                        <span className="text-green-700 dark:text-green-300 font-medium">Overall Progress</span>
                                        <span className="font-bold text-green-700 dark:text-green-300 text-lg">
                                            {photo.overallProgressPercent}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ✅ Show message if no project selected
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
                                    {confirmedPhotos.length > 0 
                                        ? Math.round(confirmedPhotos.reduce((sum, p) => sum + (p.overallProgressPercent || 0), 0) / confirmedPhotos.length) 
                                        : 0}%
                                </div>
                                <div className="text-xs text-gray-500 dark:text-slate-400">Avg Progress</div>
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
                {activeTab === 'pending' ? renderPendingPhotos() : renderConfirmedPhotos()}
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

                            {/* User Selected Milestone */}
                            {selectedPhoto.userSelectedMilestone && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6 border-2 border-green-200 dark:border-green-700">
                                    <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2 flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                        </svg>
                                        User Selected Milestone
                                    </h4>
                                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                                        {selectedPhoto.userSelectedMilestone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </p>
                                </div>
                            )}

                            {/* AI Suggestion */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                    AI Detected: {selectedPhoto.aiSuggestion?.milestone || 'Unknown'}
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                    {selectedPhoto.aiSuggestion?.reason || 'No reason provided'}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-slate-400">
                                    AI Estimated: <span className="font-bold">{selectedPhoto.aiSuggestion?.ai_estimated_completion}%</span>
                                </p>
                            </div>

                            {/* Match/Mismatch Indicator */}
                            {selectedPhoto.userSelectedMilestone && selectedPhoto.aiSuggestion && (
                                <div className={`rounded-lg p-4 mb-6 ${
                                    selectedPhoto.userSelectedMilestone.toLowerCase().replace(/_/g, ' ') === selectedPhoto.aiSuggestion.milestone.toLowerCase().replace(/_/g, ' ')
                                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700'
                                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700'
                                }`}>
                                    <p className={`font-semibold ${
                                        selectedPhoto.userSelectedMilestone.toLowerCase().replace(/_/g, ' ') === selectedPhoto.aiSuggestion.milestone.toLowerCase().replace(/_/g, ' ')
                                            ? 'text-green-800 dark:text-green-300'
                                            : 'text-yellow-800 dark:text-yellow-300'
                                    }`}>
                                        {selectedPhoto.userSelectedMilestone.toLowerCase().replace(/_/g, ' ') === selectedPhoto.aiSuggestion.milestone.toLowerCase().replace(/_/g, ' ')
                                            ? '✅ User and AI selections match! High confidence.'
                                            : '⚠️ User and AI selections differ. Please verify the correct milestone.'}
                                    </p>
                                </div>
                            )}

                            {/* User Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Confirm Milestone Completion
                                </label>
                                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                                        Reviewing: <span className="font-bold">
                                            {selectedPhoto.userSelectedMilestone 
                                                ? selectedPhoto.userSelectedMilestone.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                                : selectedPhoto.aiSuggestion?.milestone}
                                        </span>
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                                        This milestone represents <span className="font-bold">{MILESTONE_WEIGHTS[selectedPhoto.aiSuggestion?.milestone] || 0}%</span> of total project
                                    </p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    What percentage is this milestone complete? (1-100)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={userPercentage}
                                        onChange={(e) => setUserPercentage(e.target.value)}
                                        className="w-full px-4 py-3 text-2xl font-bold text-center border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="85"
                                    />
                                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-2xl font-bold text-gray-400 dark:text-slate-500">%</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                                    Example: If the frame is 85% complete, enter 85
                                </p>
                            </div>

                            {/* Calculation Preview */}
                            {userPercentage && userPercentage > 0 && userPercentage <= 100 && (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                                    <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">Preview Calculation:</h4>
                                    <p className="text-sm text-gray-700 dark:text-slate-300">
                                        {selectedPhoto.aiSuggestion?.milestone} ({MILESTONE_WEIGHTS[selectedPhoto.aiSuggestion?.milestone]}%) × {userPercentage}% = 
                                        <span className="font-bold text-green-600 dark:text-green-400 ml-2">
                                            {((MILESTONE_WEIGHTS[selectedPhoto.aiSuggestion?.milestone] / 100) * userPercentage).toFixed(2)}% overall progress
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl">
                            <button
                                onClick={() => handleConfirm(false)}
                                disabled={isSubmitting}
                                className="px-6 py-2 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                disabled={isSubmitting || !userPercentage || userPercentage <= 0 || userPercentage > 100}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : 'Confirm Progress'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;