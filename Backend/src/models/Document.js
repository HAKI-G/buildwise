import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    documentType: {
        type: String,
        enum: ['Contract', 'Drawing', 'Specification', 'Report', 'Permit', 'Photo', 'Other'],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Approved', 'Under Review', 'Rejected', 'Pending'],
        default: 'Pending'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Document', documentSchema);