import React, { useState } from 'react';

const Documents = () => {
    const [documents, setDocuments] = useState([
        // Sample documents for demonstration
        {
            id: 1,
            name: 'Project Contract.pdf',
            type: 'Contract',
            size: '2.4 MB',
            uploadDate: '2025-01-10',
            uploadedBy: 'Admin',
            status: 'Approved',
            description: 'Main project contract with all terms and conditions'
        },
        {
            id: 2,
            name: 'Site Plans.dwg',
            type: 'Drawing',
            size: '15.7 MB',
            uploadDate: '2025-01-12',
            uploadedBy: 'Architect',
            status: 'Under Review',
            description: 'Architectural drawings and site plans'
        },
        {
            id: 3,
            name: 'Material Specifications.xlsx',
            type: 'Specification',
            size: '890 KB',
            uploadDate: '2025-01-14',
            uploadedBy: 'Engineer',
            status: 'Approved',
            description: 'Detailed material specifications and requirements'
        }
    ]);

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [documentForm, setDocumentForm] = useState({
        name: '',
        type: 'Contract',
        description: ''
    });
    const [isUploading, setIsUploading] = useState(false);
    const [filterType, setFilterType] = useState('All');

    const documentTypes = ['Contract', 'Drawing', 'Specification', 'Report', 'Permit', 'Other'];
    const statusColors = {
        'Approved': 'bg-green-100 text-green-800',
        'Under Review': 'bg-yellow-100 text-yellow-800',
        'Rejected': 'bg-red-100 text-red-800',
        'Draft': 'bg-gray-100 text-gray-800'
    };

    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        switch (extension) {
            case 'pdf':
                return (
                    <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
            case 'dwg':
            case 'dxf':
                return (
                    <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
            case 'xlsx':
            case 'xls':
                return (
                    <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                );
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        if (file) {
            setDocumentForm(prev => ({ ...prev, name: file.name }));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !documentForm.name || !documentForm.description) {
            alert('Please fill in all required fields.');
            return;
        }

        setIsUploading(true);
        // Simulate upload process
        setTimeout(() => {
            const newDocument = {
                id: Date.now(),
                name: documentForm.name,
                type: documentForm.type,
                size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
                uploadDate: new Date().toISOString().split('T')[0],
                uploadedBy: 'Current User',
                status: 'Under Review',
                description: documentForm.description
            };
            setDocuments([...documents, newDocument]);
            setShowUploadModal(false);
            setSelectedFile(null);
            setDocumentForm({ name: '', type: 'Contract', description: '' });
            setIsUploading(false);
        }, 2000);
    };

    const handleDeleteDocument = (documentId) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            setDocuments(documents.filter(doc => doc.id !== documentId));
        }
    };

    const filteredDocuments = filterType === 'All' 
        ? documents 
        : documents.filter(doc => doc.type === filterType);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Project Documents</h2>
                    <p className="text-gray-500 text-sm">{documents.length} documents total</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Upload Document
                </button>
            </div>

            {/* Filter */}
            <div className="flex space-x-4 items-center">
                <span className="text-sm font-medium text-gray-700">Filter by type:</span>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                    <option value="All">All Types</option>
                    {documentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredDocuments.map((document) => (
                                <tr key={document.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="mr-3">
                                                {getFileIcon(document.name)}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{document.name}</div>
                                                <div className="text-sm text-gray-500">{document.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{document.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{document.size}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        <div>{new Date(document.uploadDate).toLocaleDateString()}</div>
                                        <div className="text-gray-500">by {document.uploadedBy}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[document.status]}`}>
                                            {document.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex space-x-2">
                                            <button className="text-blue-600 hover:text-blue-800">View</button>
                                            <button className="text-green-600 hover:text-green-800">Download</button>
                                            <button 
                                                onClick={() => handleDeleteDocument(document.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-gray-500">No documents uploaded yet</p>
                    <p className="text-gray-400 text-sm">Upload your first project document to get started</p>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-bold mb-4">Upload Document</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
                                <input
                                    type="file"
                                    onChange={handleFileSelect}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Document Name</label>
                                <input
                                    type="text"
                                    value={documentForm.name}
                                    onChange={(e) => setDocumentForm({...documentForm, name: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                                <select
                                    value={documentForm.type}
                                    onChange={(e) => setDocumentForm({...documentForm, type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {documentTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                <textarea
                                    value={documentForm.description}
                                    onChange={(e) => setDocumentForm({...documentForm, description: e.target.value})}
                                    placeholder="Brief description of the document..."
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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



export default Documents;