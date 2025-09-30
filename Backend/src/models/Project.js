import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: String,
    contractor: String,
    dateStarted: Date,
    contractCompletionDate: Date,
    contractCost: Number,
    constructionConsultant: String,
    implementingOffice: String,
    sourcesOfFund: String,
    projectManager: String,
    status: {
        type: String,
        enum: ['Planning', 'In Progress', 'Completed', 'On Hold'],
        default: 'Planning'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Project', projectSchema);