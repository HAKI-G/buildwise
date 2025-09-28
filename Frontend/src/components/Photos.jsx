import React, { useState } from 'react';

const Photos = () => {
    const [photos, setPhotos] = useState([
        // Sample photos for demonstration
        { id: 1, name: 'Foundation Work - Day 1', uploadDate: '2025-01-15', uploadedBy: 'John Doe', url: '/api/placeholder/400/300' },
        { id: 2, name: 'Steel Framework Progress', uploadDate: '2025-01-20', uploadedBy: 'Jane Smith', url: '/api/placeholder/400/300' },
    ]);
    
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [photoDescription, setPhotoDescription] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !photoDescription) {
            alert('Please select a file and provide a description.');
            return;
        }

        setIsUploading(true);
        // Simulate upload process
        setTimeout(() => {
            const newPhoto = {
                id: Date.now(),
                name: photoDescription,
                uploadDate: new Date().toISOString().split('T')[0],
                uploadedBy: 'Current User',
                url: '/api/placeholder/400/300'
            };
            setPhotos([...photos, newPhoto]);
            setShowUploadModal(false);
            setSelectedFile(null);
            setPhotoDescription('');
            setIsUploading(false);
        }, 2000);
    };

    const handleDeletePhoto = (photoId) => {
        if (window.confirm('Are you sure you want to delete this photo?')) {
            setPhotos(photos.filter(photo => photo.id !== photoId));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Project Photos</h2>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Upload Photo
                </button>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo) => (
                    <div key={photo.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                        <div className="aspect-w-16 aspect-h-12 bg-gray-200">
                            <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                <span className="text-gray-500 text-sm">Photo Preview</span>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-medium text-gray-900 mb-2">{photo.name}</h3>
                            <div className="text-sm text-gray-500 space-y-1">
                                <p>Uploaded: {new Date(photo.uploadDate).toLocaleDateString()}</p>
                                <p>By: {photo.uploadedBy}</p>
                            </div>
                            <div className="mt-3 flex justify-end space-x-2">
                                <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                                <button className="text-green-600 hover:text-green-800 text-sm">Download</button>
                                <button 
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {photos.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-500">No photos uploaded yet</p>
                    <p className="text-gray-400 text-sm">Upload your first project photo to get started</p>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-4">Upload Photo</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <input
                                    type="text"
                                    value={photoDescription}
                                    onChange={(e) => setPhotoDescription(e.target.value)}
                                    placeholder="e.g., Foundation Work - Day 1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {isUploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Photos;