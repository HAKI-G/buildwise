import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    particulars: {
        type: String,
        required: true
    },
    expenseType: {
        type: String,
        enum: ['Materials', 'Labor', 'Equipment', 'Transportation', 'Miscellaneous'],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    itemPrice: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    }
});

const liquidationSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        required: true
    },
    budgetAmount: {
        type: Number,
        required: true
    },
    expensePeriodFrom: {
        type: Date,
        required: true
    },
    expensePeriodTo: {
        type: Date,
        required: true
    },
    expenses: [expenseSchema],
    totalSpent: {
        type: Number,
        required: true
    },
    disbursement: {
        type: Number,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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

export default mongoose.model('Liquidation', liquidationSchema);