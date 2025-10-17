import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Reports = () => {
    const [pendingPhotos, setPendingPhotos] = useState([]);
    const [confirmedPhotos, setConfirmedPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'confirmed'
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userPercentage, setUserPercentage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const API_URL = 'http://localhost:5001/api';

    // Milestone weights (matching your EC2 API)
    const MILESTONE_WEIGHTS = {
        'Foundation': 15,
        'Structural Frame': 30,
        'Roofing': 15,
        'Walls & Finishing': 25,
        'MEP Systems': 15
    };

    useEffect(() => {
        loadPhotos();
    }, []);

    const loadPhotos = async () => {
        setLoading(true);
        try {
            // Get all photos
            const response = await axios.get(`${API_URL}/photos/all/list`);
            const photos = response.data || [];

            // Separate pending and confirmed
            const pending = photos.filter(p => p.confirmationStatus === 'pending' && p.aiProcessed);
            const confirmed = photos.filter(p => p.confirmationStatus === 'confirmed');

            setPendingPhotos(pending);
            setConfirmedPhotos(confirmed);
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
            await axios.post(`${API_URL}/photos/${selectedPhoto.photoId}/confirm`, {
                updateId: selectedPhoto.updateId,
                milestone: selectedPhoto.aiSuggestion.milestone,
                userPercentage: parseInt(userPercentage),
                confirmed: confirmed
            });

            alert(confirmed ? 'Progress confirmed successfully!' : 'Photo rejected');
            setShowConfirmModal(false);
            setSelectedPhoto(null);
            setUserPercentage('');
            await loadPhotos();
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

                            {/* AI Suggestion */}
                            {photo.aiSuggestion && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-blue-900 dark:text-blue-300 flex items-center">
                                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                                </svg>
                                                AI Suggested Milestone
                                            </h4>
                                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">
                                                {photo.aiSuggestion.milestone}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getConfidenceBadge(photo.aiSuggestion.confidence)}`}>
                                            {photo.aiSuggestion.confidence} confidence
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                        <span className="font-medium">Reason:</span> {photo.aiSuggestion.reason}
                                    </p>

                                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3">
                                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                            AI Estimated Completion:
                                        </span>
                                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                            {photo.aiSuggestion.ai_estimated_completion}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Detections */}
                            {photo.aiDetections && Object.keys(photo.aiDetections).length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                        Detected Objects ({photo.totalObjects} total)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(photo.aiDetections).map(([className, detections]) => (
                                            <span key={className} className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-sm">
                                                {className}: <span className="font-semibold">{detections.length}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={() => openConfirmModal(photo)}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No confirmed reports yet</h3>
                    <p className="text-gray-500 dark:text-slate-400">Review pending photos to create reports</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {confirmedPhotos.map((photo) => (
                    <div key={photo.photoId} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                        <div className="flex gap-6">
                            {/* Photo Thumbnail */}
                            <div className="flex-shrink-0">
                                <img 
                                    src={photo.fileURL} 
                                    alt={photo.caption}
                                    className="w-48 h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                    onClick={() => window.open(photo.fileURL, '_blank')}
                                />
                            </div>

                            {/* Details */}
                            <div className="flex-1">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {photo.userConfirmedMilestone}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">
                                            {photo.caption || 'No caption'}
                                        </p>
                                    </div>
                                    <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                                        ✓ Confirmed
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-4">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                        <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Milestone Weight</p>
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {MILESTONE_WEIGHTS[photo.userConfirmedMilestone] || 0}%
                                        </p>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                        <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Completion</p>
                                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                            {photo.userInputPercentage}%
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                        <p className="text-xs text-gray-600 dark:text-slate-400 mb-1">Overall Progress</p>
                                        <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                            {photo.overallProgressPercent?.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>

                                {photo.calculation && (
                                    <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 mb-3">
                                        <p className="text-sm text-gray-700 dark:text-slate-300">
                                            <span className="font-medium">Calculation:</span> {photo.calculation}
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                                    <span>Uploaded: {new Date(photo.uploadedAt).toLocaleString()}</span>
                                    <span>Confirmed: {new Date(photo.confirmedAt).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-500 dark:text-slate-400">Loading reports...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">AI Progress Reports</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Review AI-analyzed photos and confirm progress milestones
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Pending Review</p>
                            <p className="text-3xl font-bold mt-1">{pendingPhotos.length}</p>
                        </div>
                        <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Confirmed</p>
                            <p className="text-3xl font-bold mt-1">{confirmedPhotos.length}</p>
                        </div>
                        <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm opacity-90">Total Progress</p>
                            <p className="text-3xl font-bold mt-1">
                                {confirmedPhotos.reduce((sum, p) => sum + (p.overallProgressPercent || 0), 0).toFixed(1)}%
                            </p>
                        </div>
                        <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="flex space-x-8">
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

                            {/* AI Suggestion */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                    AI Suggested: {selectedPhoto.aiSuggestion?.milestone}
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                    {selectedPhoto.aiSuggestion?.reason}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-slate-400">
                                    AI Estimated: <span className="font-bold">{selectedPhoto.aiSuggestion?.ai_estimated_completion}%</span>
                                </p>
                            </div>

                            {/* User Input */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Do you confirm this milestone?
                                </label>
                                <div className="bg-gray-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
                                        The AI detected: <span className="font-bold">{selectedPhoto.aiSuggestion?.milestone}</span>
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