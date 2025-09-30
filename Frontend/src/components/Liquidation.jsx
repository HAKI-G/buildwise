import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const getToken = () => localStorage.getItem('token');

function Liquidation() {
    const { projectId } = useParams();
    const [liquidations, setLiquidations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        purpose: '',
        budgetAmount: '',
        expensePeriodFrom: '',
        expensePeriodTo: '',
        expenses: [
            {
                particulars: '',
                expenseType: '',
                quantity: '',
                unit: '', 
                itemPrice: '',
                amount: ''
            }
        ]
    });

    useEffect(() => {
        fetchLiquidations();
    }, [projectId]);

    const fetchLiquidations = async () => {
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`http://localhost:5001/api/projects/${projectId}/liquidations`, config);
            setLiquidations(res.data);
        } catch (error) {
            console.error('Error fetching liquidations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleExpenseChange = (index, field, value) => {
        const newExpenses = [...formData.expenses];
        newExpenses[index][field] = value;

        // Auto-calculate amount if quantity and itemPrice are present
        if (field === 'quantity' || field === 'itemPrice') {
            const qty = parseFloat(newExpenses[index].quantity) || 0;
            const price = parseFloat(newExpenses[index].itemPrice) || 0;
            newExpenses[index].amount = (qty * price).toFixed(2);
        }

        setFormData(prev => ({
            ...prev,
            expenses: newExpenses
        }));
    };

    const addExpenseRow = () => {
        setFormData(prev => ({
            ...prev,
            expenses: [
                ...prev.expenses,
                {
                    particulars: '',
                    expenseType: '',
                    quantity: '',
                    itemPrice: '',
                    amount: ''
                }
            ]
        }));
    };

    const removeExpenseRow = (index) => {
        setFormData(prev => ({
            ...prev,
            expenses: prev.expenses.filter((_, i) => i !== index)
        }));
    };

    const calculateTotals = () => {
        const totalSpent = formData.expenses.reduce((sum, exp) => 
            sum + (parseFloat(exp.amount) || 0), 0
        );
        const cashAdvance = parseFloat(formData.budgetAmount) || 0;
        const disbursement = totalSpent - cashAdvance;

        return {
            totalSpent: totalSpent.toFixed(2),
            cashAdvance: cashAdvance.toFixed(2),
            disbursement: disbursement.toFixed(2)
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const totals = calculateTotals();
            const dataToSend = {
                ...formData,
                projectId,
                totalSpent: parseFloat(totals.totalSpent),
                disbursement: parseFloat(totals.disbursement)
            };

            if (editingId) {
                await axios.put(
                    `http://localhost:5001/api/projects/${projectId}/liquidations/${editingId}`,
                    dataToSend,
                    config
                );
            } else {
                await axios.post(
                    `http://localhost:5001/api/projects/${projectId}/liquidations`,
                    dataToSend,
                    config
                );
            }

            resetForm();
            fetchLiquidations();
            setShowForm(false);
        } catch (error) {
            console.error('Error saving liquidation:', error);
            alert('Failed to save liquidation report');
        }
    };

    const handleEdit = (liquidation) => {
        setFormData({
            name: liquidation.name,
            purpose: liquidation.purpose,
            budgetAmount: liquidation.budgetAmount,
            expensePeriodFrom: liquidation.expensePeriodFrom?.split('T')[0] || '',
            expensePeriodTo: liquidation.expensePeriodTo?.split('T')[0] || '',
            expenses: liquidation.expenses
        });
        setEditingId(liquidation.liquidationId); // CHANGED: _id to liquidationId
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this liquidation report?')) return;

        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(
                `http://localhost:5001/api/projects/${projectId}/liquidations/${id}`,
                config
            );
            fetchLiquidations();
        } catch (error) {
            console.error('Error deleting liquidation:', error);
            alert('Failed to delete liquidation report');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            purpose: '',
            budgetAmount: '',
            expensePeriodFrom: '',
            expensePeriodTo: '',
            expenses: [{
                particulars: '',
                expenseType: '',
                quantity: '',
                itemPrice: '',
                amount: ''
            }]
        });
        setEditingId(null);
    };

    const handleDownloadPDF = async (liquidationId, name) => {
        try {
            const token = getToken();
            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            };
            
            const response = await axios.get(
                `http://localhost:5001/api/projects/${projectId}/liquidations/${liquidationId}/pdf`,
                config
            );
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `liquidation-${name.replace(/\s+/g, '-')}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF');
        }
    };

    const totals = calculateTotals();

    if (loading) {
        return <div className="text-center p-8">Loading liquidation reports...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Liquidation Reports</h2>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(!showForm);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {showForm ? 'Cancel' : '+ New Liquidation Report'}
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
                    <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Liquidation Report</h2>
                    </div>

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                            <input
                                type="text"
                                name="purpose"
                                value={formData.purpose}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {/* Budget & Period */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Budget Amount (₱)
                            </label>
                            <input
                                type="number"
                                name="budgetAmount"
                                value={formData.budgetAmount}
                                onChange={handleInputChange}
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Period From
                            </label>
                            <input
                                type="date"
                                name="expensePeriodFrom"
                                value={formData.expensePeriodFrom}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Period To
                            </label>
                            <input
                                type="date"
                                name="expensePeriodTo"
                                value={formData.expensePeriodTo}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            />
                        </div>
                    </div>

                    {/* Expense Table */}
                    <div className="overflow-x-auto">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Expense Report</h3>
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-blue-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Particulars</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Item Price (₱)</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount (₱)</th>
                                    <th className="px-3 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {formData.expenses.map((expense, index) => (
                                    <tr key={index}>
                                        <td className="px-3 py-2">
                                            <input
                                                type="text"
                                                value={expense.unit || ''}
                                                onChange={(e) => handleExpenseChange(index, 'unit', e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                                placeholder={
                                                    expense.expenseType === 'Labor' ? 'days' :
                                                    expense.expenseType === 'Materials' ? 'pcs/bags/m' :
                                                    expense.expenseType === 'Transportation' ? 'trip' :
                                                    expense.expenseType === 'Equipment' ? 'hours/days' :
                                                    'unit'
                                                }
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <select
                                                value={expense.expenseType}
                                                onChange={(e) => handleExpenseChange(index, 'expenseType', e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                                required
                                            >
                                                <option value="">Select</option>
                                                <option value="Materials">Materials</option>
                                                <option value="Labor">Labor</option>
                                                <option value="Equipment">Equipment</option>
                                                <option value="Transportation">Transportation</option>
                                                <option value="Miscellaneous">Miscellaneous</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={expense.quantity}
                                                onChange={(e) => handleExpenseChange(index, 'quantity', e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                                step="0.01"
                                                placeholder="0"
                                                required
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={expense.itemPrice}
                                                onChange={(e) => handleExpenseChange(index, 'itemPrice', e.target.value)}
                                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                                step="0.01"
                                                placeholder="0.00"
                                                required
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                value={expense.amount}
                                                readOnly
                                                className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            {formData.expenses.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeExpenseRow(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button
                            type="button"
                            onClick={addExpenseRow}
                            className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Add Expense Row
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Summary</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="font-medium">Amount of Cash Advance:</span>
                                <span className="font-bold">₱{totals.cashAdvance}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Total Amount Spent:</span>
                                <span className="font-bold">₱{totals.totalSpent}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="font-medium">Disbursement:</span>
                                <span className={`font-bold ${parseFloat(totals.disbursement) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₱{totals.disbursement}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                setShowForm(false);
                            }}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            {editingId ? 'Update Report' : 'Save Report'}
                        </button>
                    </div>
                </form>
            )}

            {/* List of Liquidations */}
            <div className="space-y-4">
                {liquidations.length === 0 ? (
                    <div className="text-center p-8 bg-white border border-gray-200 rounded-lg">
                        <p className="text-gray-500">No liquidation reports yet. Click "New Liquidation Report" to create one.</p>
                    </div>
                ) : (
                    liquidations.map((liquidation) => (
                        <div key={liquidation.liquidationId} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{liquidation.name}</h3>
                                    <p className="text-sm text-gray-600">{liquidation.purpose}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Period: {new Date(liquidation.expensePeriodFrom).toLocaleDateString()} - {new Date(liquidation.expensePeriodTo).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleDownloadPDF(liquidation.liquidationId, liquidation.name)}
                                        className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                                    >
                                        Download PDF
                                    </button>
                                    <button
                                        onClick={() => handleEdit(liquidation)}
                                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(liquidation.liquidationId)}
                                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="bg-blue-50 p-3 rounded">
                                    <p className="text-xs text-gray-600">Cash Advance</p>
                                    <p className="text-lg font-bold text-gray-800">₱{liquidation.budgetAmount.toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                    <p className="text-xs text-gray-600">Total Spent</p>
                                    <p className="text-lg font-bold text-gray-800">₱{liquidation.totalSpent.toLocaleString()}</p>
                                </div>
                                <div className={`p-3 rounded ${liquidation.disbursement < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                    <p className="text-xs text-gray-600">Disbursement</p>
                                    <p className={`text-lg font-bold ${liquidation.disbursement < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₱{liquidation.disbursement.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-blue-50">
                                        <tr>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Particulars</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Unit</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Item Price (₱)</th>
                                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount (₱)</th>
                                            <th className="px-3 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                    {liquidation.expenses.map((expense, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2">{expense.particulars}</td>
                                            <td className="px-3 py-2">{expense.expenseType}</td>
                                            <td className="px-3 py-2 text-right">{expense.quantity} {expense.unit || ''}</td>
                                            <td className="px-3 py-2 text-right">₱{parseFloat(expense.itemPrice).toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right font-medium">₱{parseFloat(expense.amount).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Liquidation;