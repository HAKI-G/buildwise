import React, { useState, useEffect } from 'react';

const Photos = () => {
    const [photos, setPhotos] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoCaption, setPhotoCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUpdateId, setSelectedUpdateId] = useState('');
    const [error, setError] = useState(null);
    
    const API_URL = 'http://localhost:5001/api';

    // Automatically load ALL photos when component mounts
    useEffect(() => {
        console.log('Photos component mounted - loading all photos...');
        loadAllPhotos();
    }, []);

    const loadAllPhotos = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('Fetching from:', `${API_URL}/photos/all/list`);
            const response = await fetch(`${API_URL}/photos/all/list`);
            
            if (!response.ok) {
                throw new Error(`Failed to load photos: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Photos loaded successfully:', data.length, 'photos');
            setPhotos(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading all photos:', error);
            setError(error.message);
            setPhotos([]);
        } finally {
            setIsLoading(false);
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
            
            console.log('Uploading to:', `${API_URL}/photos/${selectedUpdateId}`);
            
            const response = await fetch(`${API_URL}/photos/${selectedUpdateId}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Upload successful:', result);
            
            // Reload all photos to show the new one
            await loadAllPhotos();
            
            setShowUploadModal(false);
            setSelectedFile(null);
            setPhotoCaption('');
            setSelectedUpdateId('');
            
            alert('Photo uploaded successfully!');
            
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

            // Remove photo from state immediately
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
                    <h2 className="text-2xl font-bold text-gray-800">Project Photos</h2>
                    <p className="text-sm text-gray-500 mt-1">
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="font-medium">Error:</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-500">Loading photos...</p>
                </div>
            )}

            {/* Photos Grid */}
            {!isLoading && photos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {photos.map((photo) => (
                        <div 
                            key={photo.photoId} 
                            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                        >
                            <div className="relative aspect-w-16 aspect-h-12 bg-gray-100">
                                {photo.fileURL ? (
                                    <img 
                                        src={photo.fileURL} 
                                        alt={photo.caption}
                                        className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() => handleViewPhoto(photo)}
                                        onError={(e) => {
                                            console.error('Image load error:', photo.fileURL);
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<div class="w-full h-48 bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center"><span class="text-red-600 text-sm">Image failed to load</span></div>';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                        <span className="text-gray-500 text-sm">No preview</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-2">
                                    {photo.caption || 'No caption'}
                                </h3>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p><span className="font-medium">Update:</span> {photo.updateId}</p>
                                    <p><span className="font-medium">Uploaded:</span> {new Date(photo.uploadedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="mt-4 flex justify-end gap-2">
                                    <button 
                                        onClick={() => handleViewPhoto(photo)}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        View
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePhoto(photo)}
                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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
                <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No photos uploaded yet</h3>
                    <p className="text-gray-500 mb-6">Upload your first project photo to get started</p>
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                            <h3 className="text-xl font-bold text-gray-900">Upload Photo</h3>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedFile(null);
                                    setPhotoCaption('');
                                    setSelectedUpdateId('');
                                }}
                                disabled={isUploading}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Update ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={selectedUpdateId}
                                    onChange={(e) => setSelectedUpdateId(e.target.value)}
                                    placeholder="e.g., AW"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isUploading}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Photo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    disabled={isUploading}
                                />
                                {selectedFile && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                                        <p className="text-xs text-gray-600">
                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Caption (Optional)
                                </label>
                                <textarea
                                    value={photoCaption}
                                    onChange={(e) => setPhotoCaption(e.target.value)}
                                    placeholder="Add a description..."
                                    rows="3"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    disabled={isUploading}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedFile(null);
                                    setPhotoCaption('');
                                    setSelectedUpdateId('');
                                }}
                                disabled={isUploading}
                                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !selectedFile || !selectedUpdateId}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploading ? 'Uploading...' : 'Upload Photo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Photos;