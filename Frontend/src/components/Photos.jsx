import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const Photos = () => {
    const { projectId } = useParams();
    const [photos, setPhotos] = useState([]);
    const [milestones, setMilestones] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoCaption, setPhotoCaption] = useState('');
    const [selectedMilestone, setSelectedMilestone] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUpdateId, setSelectedUpdateId] = useState('');
    const [error, setError] = useState(null);
    
    const API_URL = 'http://localhost:5001/api';

    useEffect(() => {
        loadAllPhotos();
        loadMilestones();
    }, []);

    const loadAllPhotos = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`${API_URL}/photos/all/list`);
            
            if (!response.ok) {
                throw new Error(`Failed to load photos: ${response.status}`);
            }
            
            const data = await response.json();
            setPhotos(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading all photos:', error);
            setError(error.message);
            setPhotos([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMilestones = async () => {
        if (!projectId) return;
        
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_URL}/milestones/project/${projectId}`, config);
            
            // Get only tasks (not phases)
            const tasks = response.data.filter(item => !item.isPhase);
            setMilestones(tasks);
        } catch (error) {
            console.error('Error loading milestones:', error);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !selectedUpdateId) {
            alert('Please select a file and enter an update ID.');
            return;
        }

        setIsUploading(true);
        setError(null);
        
        try {
            const formData = new FormData();
            formData.append('photo', selectedFile);
            formData.append('caption', photoCaption || 'No caption');
            if (selectedMilestone) {
                formData.append('milestoneId', selectedMilestone);
            }
            
            const response = await fetch(`${API_URL}/photos/${selectedUpdateId}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            await loadAllPhotos();
            
            setShowUploadModal(false);
            setSelectedFile(null);
            setPhotoCaption('');
            setSelectedUpdateId('');
            setSelectedMilestone('');
            
            alert('Photo uploaded and analyzed successfully!');
            
        } catch (error) {
            console.error('Upload error:', error);
            setError(error.message);
            alert(`Failed to upload photo: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleViewPhoto = (photo) => {
        if (photo.fileURL) {
            window.open(photo.fileURL, '_blank');
        } else {
            alert('Photo URL not available');
        }
    };

    const handleDeletePhoto = async (photo) => {
        if (!window.confirm(`Are you sure you want to delete this photo?\n\nCaption: ${photo.caption || 'No caption'}`)) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/photos/${photo.photoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    updateId: photo.updateId,
                    s3Key: photo.s3Key
                })
            });

            if (!response.ok) {
                throw new Error('Failed to delete photo');
            }

            setPhotos(photos.filter(p => p.photoId !== photo.photoId));
            alert('Photo deleted successfully!');
        } catch (error) {
            console.error('Error deleting photo:', error);
            alert('Failed to delete photo. Please try again.');
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Project Photos</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        {isLoading ? 'Loading...' : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'} available`}
                    </p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Upload Photo
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
                    <p className="font-medium">Error:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-500 dark:text-slate-400">Loading photos...</p>
                </div>
            )}

            {/* Photos Grid */}
            {!isLoading && photos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {photos.map((photo) => (
                        <div 
                            key={photo.photoId} 
                            className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all overflow-hidden"
                        >
                            <div className="relative aspect-w-16 aspect-h-12 bg-gray-100 dark:bg-slate-700">
                                {photo.fileURL ? (
                                    <img 
                                        src={photo.fileURL} 
                                        alt={photo.caption}
                                        className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => handleViewPhoto(photo)}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<div class="w-full h-48 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center"><span class="text-red-600 dark:text-red-400 text-sm">Image failed to load</span></div>';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center">
                                        <span className="text-gray-500 dark:text-slate-400 text-sm">No preview</span>
                                    </div>
                                )}
                                {/* AI Status Badge */}
                                {photo.aiProcessed && (
                                    <div className="absolute top-2 right-2">
                                        <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                                            ✓ AI Analyzed
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                                    {photo.caption || 'No caption'}
                                </h3>
                                <div className="text-xs text-gray-500 dark:text-slate-400 space-y-1">
                                    <p><span className="font-medium">Update:</span> {photo.updateId}</p>
                                    <p><span className="font-medium">Uploaded:</span> {new Date(photo.uploadedAt).toLocaleDateString()}</p>
                                    {photo.aiSuggestion && (
                                        <p><span className="font-medium">AI Detected:</span> {photo.aiSuggestion.milestone}</p>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleViewPhoto(photo)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                                    >
                                        View
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePhoto(photo)}
                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && photos.length === 0 && !error && (
                <div className="text-center py-16 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
                    <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No photos uploaded yet</h3>
                    <p className="text-gray-500 dark:text-slate-400 mb-6">Upload your first project photo to get AI analysis</p>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Upload Photo
                    </button>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upload Photo</h3>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedFile(null);
                                    setPhotoCaption('');
                                    setSelectedUpdateId('');
                                    setSelectedMilestone('');
                                }}
                                disabled={isUploading}
                                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Update ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={selectedUpdateId}
                                    onChange={(e) => setSelectedUpdateId(e.target.value)}
                                    placeholder="e.g., AW"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isUploading}
                                />
                            </div>

                            {/* NEW: Milestone Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Related Task/Milestone (Optional)
                                </label>
                                <select
                                    value={selectedMilestone}
                                    onChange={(e) => setSelectedMilestone(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isUploading}
                                >
                                    <option value="">Select a task...</option>
                                    {milestones.map((milestone) => (
                                        <option key={milestone.milestoneId} value={milestone.milestoneId}>
                                            {milestone.milestoneName || milestone.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                    Link this photo to a specific task for better organization
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Select Photo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
                                    disabled={isUploading}
                                />
                                {selectedFile && (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                                        <p className="text-xs text-gray-600 dark:text-slate-400">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Caption (Optional)
                                </label>
                                <textarea
                                    value={photoCaption}
                                    onChange={(e) => setPhotoCaption(e.target.value)}
                                    placeholder="Add a description..."
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    disabled={isUploading}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedFile(null);
                                    setPhotoCaption('');
                                    setSelectedUpdateId('');
                                    setSelectedMilestone('');
                                }}
                                disabled={isUploading}
                                className="px-6 py-2 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !selectedFile || !selectedUpdateId}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isUploading && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                )}
                                {isUploading ? 'Uploading & Analyzing...' : 'Upload Photo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Photos;