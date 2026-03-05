import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import axios from 'axios';

const getToken = () => localStorage.getItem('token');

function Documents({ readonly }) {
    const { projectId } = useParams();
    const notify = useNotification();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [filterType, setFilterType] = useState('All Types');
    const [showUploadModal, setShowUploadModal] = useState(false);

    const [uploadData, setUploadData] = useState({
        file: null,
        documentType: 'Contract',
        description: ''
    });

    useEffect(() => {
        fetchDocuments();
    }, [projectId]);

    const fetchDocuments = async () => {
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/documents/project/${projectId}`, config);
            setDocuments(res.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 50 * 1024 * 1024) {
                notify.warning('File size must be less than 50MB.');
                e.target.value = '';
                return;
            }

            const allowedTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'image/jpeg',
                'image/png',
                'image/jpg',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain'
            ];

            if (!allowedTypes.includes(file.type)) {
                notify.warning('File type not supported. Please upload PDF, Word, Excel, PowerPoint, Text, or Image files.');
                e.target.value = '';
                return;
            }

            setUploadData(prev => ({ ...prev, file }));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!uploadData.file) {
            notify.warning('Please select a file.');
            return;
        }

        setUploading(true);

        try {
            const token = getToken();
            const formData = new FormData();
            formData.append('document', uploadData.file);
            formData.append('projectId', projectId);
            formData.append('documentType', uploadData.documentType);
            formData.append('description', uploadData.description);

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            };

            await axios.post(`${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/documents/upload`, formData, config);
            
            setUploadData({
                file: null,
                documentType: 'Contract',
                description: ''
            });
            
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) fileInput.value = '';
            
            setShowUploadModal(false);
            fetchDocuments();
            
            notify.success('Document uploaded successfully!');
        } catch (error) {
            console.error('Error uploading document:', error);
            notify.error(error.response?.data?.message || 'Failed to upload document.');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (documentId, filename) => {
        try {
            const token = getToken();
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                params: { projectId }
            };

            const res = await axios.get(
                `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/documents/${documentId}/download`,
                config
            );
            
            if (res.data.downloadUrl) {
                // S4 Fix: Fetch the file as a blob to handle cross-origin S3 URLs
                // The <a download> attribute doesn't work for cross-origin URLs
                const fileResponse = await fetch(res.data.downloadUrl);
                const blob = await fileResponse.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the blob URL
                window.URL.revokeObjectURL(blobUrl);
            }
        } catch (error) {
            console.error('Error downloading document:', error);
            notify.error(error.response?.data?.message || 'Failed to download document.');
        }
    };

    const handleView = (documentId) => {
        window.open(
            `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/documents/${documentId}/view?projectId=${projectId}`,
            '_blank'
        );
    };

    const handleDelete = async (documentId) => {
        notify.confirm('Are you sure you want to delete this document?', async () => {
            try {
                const token = getToken();
                const config = {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { projectId }
                };
                
                await axios.delete(`${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/documents/${documentId}`, config);
                fetchDocuments();
                notify.success('Document deleted successfully.');
            } catch (error) {
                console.error('Error deleting document:', error);
                notify.error(error.response?.data?.message || 'Failed to delete document.');
            }
        }, { title: 'Delete Document', confirmText: 'Delete', cancelText: 'Cancel' });
    };

    const updateStatus = async (documentId, newStatus) => {
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            await axios.put(
                `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/documents/${documentId}/status`,
                { status: newStatus, projectId },
                config
            );
            
            fetchDocuments();
        } catch (error) {
            console.error('Error updating status:', error);
            notify.error(error.response?.data?.message || 'Failed to update status.');
        }
    };

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: '📄', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗',
            ppt: '📙', pptx: '📙', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', txt: '📝'
        };
        return icons[ext] || '📎';
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const getStatusColor = (status) => {
        const colors = {
            'Approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'Under Review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            'Rejected': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            'Pending': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    };

    const filteredDocuments = filterType === 'All Types' 
        ? documents 
        : documents.filter(doc => doc.documentType === filterType);

    if (loading) {
        return <div className="text-center p-8 text-gray-900 dark:text-white">Loading documents...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Project Documents</h2>
                    <p className="text-sm text-gray-600 dark:text-slate-400">{documents.length} documents total</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    disabled={readonly}
                    title={readonly ? "Project is completed - cannot upload documents" : "Upload new document"}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Upload Document
                </button>
                {readonly && (
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 ml-3">
                        ⛔ Project completed - uploads disabled
                    </span>
                )}
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Filter by type:</span>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option>All Types</option>
                    <option>Contract</option>
                    <option>Drawing</option>
                    <option>Specification</option>
                    <option>Report</option>
                    <option>Permit</option>
                    <option>Photo</option>
                    <option>Other</option>
                </select>
            </div>

            {/* Upload Modal */}
            {showUploadModal && !readonly && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Upload Document</h3>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Document Type
                                </label>
                                <select
                                    value={uploadData.documentType}
                                    onChange={(e) => setUploadData(prev => ({ ...prev, documentType: e.target.value }))}
                                    disabled={uploading}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    required
                                >
                                    <option>Contract</option>
                                    <option>Drawing</option>
                                    <option>Specification</option>
                                    <option>Report</option>
                                    <option>Permit</option>
                                    <option>Photo</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={uploadData.description}
                                    onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                                    disabled={uploading}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    placeholder="Brief description of the document"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                    File (PDF, Word, Excel, Image - Max 50MB)
                                </label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.txt"
                                    required
                                />
                                {uploadData.file && (
                                    <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                                        Selected: {uploadData.file.name} ({formatFileSize(uploadData.file.size)})
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        setUploadData({ file: null, documentType: 'Contract', description: '' });
                                        const fileInput = document.querySelector('input[type="file"]');
                                        if (fileInput) fileInput.value = '';
                                    }}
                                    className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-900 dark:text-white"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Documents Table */}
            {filteredDocuments.length === 0 ? (
                <div className="text-center p-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <p className="text-gray-500 dark:text-slate-400">No documents uploaded yet.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden transition-colors">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Document
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Size
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Uploaded
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {filteredDocuments.map((doc) => (
                                <tr key={doc.documentId} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <span className="text-2xl mr-3">{getFileIcon(doc.filename)}</span>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.filename}</div>
                                                <div className="text-sm text-gray-500 dark:text-slate-400">{doc.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-900 dark:text-white">{doc.documentType}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-gray-900 dark:text-white">{formatFileSize(doc.fileSize)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-white">
                                            {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-slate-400">
                                            by {doc.uploadedBy?.name || 'Unknown'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select
                                            value={doc.status}
                                            onChange={(e) => updateStatus(doc.documentId, e.target.value)}
                                            className={`text-sm px-2 py-1 rounded-full ${getStatusColor(doc.status)}`}
                                        >
                                            <option>Approved</option>
                                            <option>Under Review</option>
                                            <option>Rejected</option>
                                            <option>Pending</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleView(doc.documentId)}
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleDownload(doc.documentId, doc.filename)}
                                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-3"
                                        >
                                            Download
                                        </button>
                                        <button
                                            onClick={() => handleDelete(doc.documentId)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Documents;