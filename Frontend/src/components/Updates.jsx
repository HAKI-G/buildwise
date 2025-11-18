import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import Liquidation from './Liquidation';

const getToken = () => localStorage.getItem('token');

const Updates = ({ readonly, projectData }) => {
    const { projectId } = useParams();
    const [expenses, setExpenses] = useState([]);
    const [expenseItems, setExpenseItems] = useState([]);  // ✅ Array for material + quantity items
    const [selectedMaterial, setSelectedMaterial] = useState('');  // ✅ For dropdown selection
    const [selectedQuantity, setSelectedQuantity] = useState('1');  // ✅ For quantity
    const [expenseCategory, setExpenseCategory] = useState('Materials');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showLiquidation, setShowLiquidation] = useState(false);

    const materialPrices = {
        'Wood': 500,
        'Stone': 800,
        'Sand and Gravel': 300,
        'Clay': 200,
        'Concrete': 5000,
        'Steel': 3000,
        'Cement': 250,
        'Brick': 8,
        'Glass': 1500,
        'Plastics': 100,
        'Ceramics': 600
    };

    const materials = Object.keys(materialPrices);

    const categories = [
        'Materials',
        'Labor',
        'Equipment',
        'Transportation',
        'Meals & Snacks',
        'Miscellaneous'
    ];

    useEffect(() => {
        const fetchExpenses = async () => {
            const token = getToken();
            if (!token) return;
            
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            try {
                const expensesRes = await axios.get(
                    `http://localhost:5001/api/expenses/project/${projectId}`, 
                    config
                );
                setExpenses(expensesRes.data || []);
                setError('');
            } catch (expenseError) {
                if (expenseError.response?.status === 404) {
                    console.warn('Expenses endpoint not found, setting empty array');
                    setExpenses([]);
                } else {
                    console.error('Error fetching expenses:', expenseError);
                }
            }
        };

        fetchExpenses();
    }, [projectId]);

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (expenseItems.length === 0) {
            alert('Please add at least one material with quantity.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');
        
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        // Calculate total amount from all items
        const totalAmount = expenseItems.reduce((sum, item) => {
            return sum + (materialPrices[item.material] * item.quantity);
        }, 0);

        // Create description with materials and quantities
        const description = expenseItems.map(item => 
            `${item.material} x${item.quantity} @ ₱${materialPrices[item.material]}/unit`
        ).join('\n');

        const newExpense = {
            description: description,
            amount: totalAmount,
            category: expenseCategory,
            date: new Date().toISOString()
        };

        try {
            await axios.post(
                `http://localhost:5001/api/expenses/${projectId}`, 
                newExpense, 
                config
            );
            setExpenseItems([]);  // ✅ Reset items
            setSelectedMaterial('');  // ✅ Reset dropdown
            setSelectedQuantity('1');  // ✅ Reset quantity
            setExpenseCategory('Materials');
            setSuccessMessage('Expense added successfully!');
            
            const expensesRes = await axios.get(
                `http://localhost:5001/api/expenses/project/${projectId}`, 
                config
            );
            setExpenses(expensesRes.data || []);
            
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Error adding expense:', err);
            if (err.response?.status === 404) {
                setError('Expense functionality is not yet implemented on the backend.');
            } else {
                setError('Failed to add expense. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate total amount for display
    const calculateTotal = () => {
        return expenseItems.reduce((sum, item) => {
            return sum + (materialPrices[item.material] * item.quantity);
        }, 0);
    };

    const totalExpenses = expenses.reduce((sum, expense) => 
        sum + parseFloat(expense.amount || 0), 0
    );

    return (
        <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-4 no-print">
                <button
                    onClick={() => setShowLiquidation(false)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        !showLiquidation
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                >
                     Add Expenses
                </button>
                <button
                    onClick={() => setShowLiquidation(true)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        showLiquidation
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                >
                     View Liquidation
                </button>
            </div>

            {!showLiquidation ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Expense Form */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            Add New Expense
                        </h2>
                        
                        {readonly && (
                            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm">
                                ⛔ This project is completed. Expenses cannot be added.
                            </div>
                        )}
                        
                        {successMessage && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 rounded-lg text-sm">
                                {successMessage}
                            </div>
                        )}
                        
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        
                        <form onSubmit={handleAddExpense}>
                            <div className="mb-4">
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                    disabled={isSubmitting || readonly}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="materials" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Materials
                                </label>
                                <div className="space-y-2">
                                    {expenseItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-white">{item.material}</div>
                                                <div className="text-sm text-gray-600 dark:text-slate-400">
                                                    Qty: {item.quantity} × ₱{materialPrices[item.material].toLocaleString()} = ₱{(item.quantity * materialPrices[item.material]).toLocaleString()}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const updated = expenseItems.filter((_, i) => i !== index);
                                                    setExpenseItems(updated);
                                                }}
                                                disabled={isSubmitting || readonly}
                                                className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:cursor-not-allowed"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <div className="flex items-end gap-2 pt-2 border-t border-gray-300 dark:border-slate-600">
                                        <div className="flex-1">
                                            <label htmlFor="material-select" className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">
                                                Select Material
                                            </label>
                                            <select
                                                id="material-select"
                                                value={selectedMaterial}
                                                onChange={(e) => setSelectedMaterial(e.target.value)}
                                                disabled={isSubmitting || readonly}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                            >
                                                <option value="">Choose material...</option>
                                                {materials.map(material => (
                                                    <option key={material} value={material}>
                                                        {material} (₱{materialPrices[material].toLocaleString()})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="w-24">
                                            <label htmlFor="qty-input" className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">
                                                Quantity
                                            </label>
                                            <input
                                                id="qty-input"
                                                type="number"
                                                min="1"
                                                value={selectedQuantity}
                                                onChange={(e) => setSelectedQuantity(e.target.value || '1')}
                                                disabled={isSubmitting || readonly}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (selectedMaterial) {
                                                    setExpenseItems([...expenseItems, {
                                                        material: selectedMaterial,
                                                        quantity: parseInt(selectedQuantity) || 1
                                                    }]);
                                                    setSelectedMaterial('');
                                                    setSelectedQuantity('1');
                                                }
                                            }}
                                            disabled={isSubmitting || readonly || !selectedMaterial}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Display Total Amount */}
                            {expenseItems.length > 0 && (
                                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Total Amount:</span>
                                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            ₱{calculateTotal().toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={isSubmitting || readonly || expenseItems.length === 0} 
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Expense'}
                            </button>
                        </form>
                    </div>

                    {/* Expense Log */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Expense Log</h2>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-slate-400">Total Expenses</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    ₱{totalExpenses.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                                <thead className="bg-gray-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                                    {expenses.length > 0 ? (
                                        expenses.map((expense, index) => (
                                            <tr key={expense.expenseId || index} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        expense.category === 'Materials' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                                        expense.category === 'Labor' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                                        expense.category === 'Equipment' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                                        'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                                                    }`}>
                                                        {expense.category || 'Others'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                    {expense.description}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                                    {expense.date ? new Date(expense.date).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                                                    ₱{parseFloat(expense.amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="text-center py-8 text-gray-500 dark:text-slate-400">
                                                No expenses logged yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                // Liquidation Component
                <Liquidation 
                    expenses={expenses}
                    categories={categories}
                    projectName={projectData?.name || "Construction Project"}
                    projectLocation={projectData?.location || ""}
                />
            )}
        </div>
    );
};

export default Updates;