import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const getToken = () => localStorage.getItem('token');

const Updates = ({ readonly }) => {
    const { projectId } = useParams();
    const [expenses, setExpenses] = useState([]);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('Materials');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showLiquidation, setShowLiquidation] = useState(false);

    const categories = [
        'Materials',
        'Labor',
        'Equipment',
        'Transportation',
        'Meals & Snacks',
        'Miscellaneous'
    ];

    // ✅ FIX: Move fetchExpenses inside useEffect to avoid dependency issues
    useEffect(() => {
        const fetchExpenses = async () => {
            const token = getToken();
            if (!token) return;
            
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            try {
                const expensesRes = await axios.get(`http://localhost:5001/api/expenses/project/${projectId}`, config);
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
    }, [projectId]); // ✅ Only depends on projectId

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseDescription || !expenseAmount) {
            alert('Please fill out both description and amount.');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setSuccessMessage('');
        
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const newExpense = {
            description: expenseDescription,
            amount: parseFloat(expenseAmount),
            category: expenseCategory,
            date: new Date().toISOString()
        };

        try {
            await axios.post(`http://localhost:5001/api/expenses/${projectId}`, newExpense, config);
            setExpenseDescription('');
            setExpenseAmount('');
            setExpenseCategory('Materials');
            setSuccessMessage('Expense added successfully!');
            
            // ✅ FIX: Refetch expenses inline
            const expensesRes = await axios.get(`http://localhost:5001/api/expenses/project/${projectId}`, config);
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

    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);

    // Group expenses by category for liquidation
    const groupedExpenses = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Others';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(expense);
        return acc;
    }, {});

    const getCategoryTotal = (category) => {
        return (groupedExpenses[category] || []).reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    };

    const printLiquidation = () => {
        window.print();
    };

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
                    📝 Add Expenses
                </button>
                <button
                    onClick={() => setShowLiquidation(true)}
                    className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        showLiquidation
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                    }`}
                >
                    📊 View Liquidation
                </button>
            </div>

            {!showLiquidation ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add New Expense</h2>
                        
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
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Description
                                </label>
                                <input
                                    type="text" 
                                    id="description" 
                                    value={expenseDescription} 
                                    onChange={(e) => setExpenseDescription(e.target.value)}
                                    disabled={isSubmitting || readonly}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    placeholder="e.g., Cement - 50 bags @ ₱250/bag" 
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                    Amount (PHP)
                                </label>
                                <input
                                    type="number" 
                                    id="amount" 
                                    value={expenseAmount} 
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    disabled={isSubmitting || readonly}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    placeholder="e.g., 12500"
                                    step="0.01"
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSubmitting || readonly} 
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                            >
                                {isSubmitting ? 'Adding...' : 'Add Expense'}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Expense Log</h2>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-slate-400">Total Expenses</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">₱{totalExpenses.toLocaleString()}</p>
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
                // Liquidation Report View
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    {/* Header */}
                    <div className="text-center mb-6 border-b-2 border-gray-800 dark:border-slate-300 pb-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">BUDGET LIQUIDATION</h1>
                        <p className="text-sm text-gray-600 dark:text-slate-400">Date of Submission: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">Amount requested: ₱{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="flex justify-end mb-4 no-print">
                        <button
                            onClick={printLiquidation}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            🖨️ Print Report
                        </button>
                    </div>

                    <div className="space-y-6">
                        {categories.map((category, catIndex) => {
                            const categoryExpenses = groupedExpenses[category];
                            if (!categoryExpenses || categoryExpenses.length === 0) return null;

                            return (
                                <div key={category} className="mb-6">
                                    {/* Category Header */}
                                    <div className="bg-gray-200 dark:bg-slate-700 px-4 py-2 mb-2">
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">{String.fromCharCode(65 + catIndex)}. {category}</h3>
                                    </div>
                                    
                                    {/* Category Table */}
                                    <table className="w-full border-collapse border border-gray-400 dark:border-slate-600">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-slate-800">
                                                <th className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-300">Company</th>
                                                <th className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-300">Particulars</th>
                                                <th className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-slate-300">Total Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categoryExpenses.map((expense, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                    <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-white">
                                                        {expense.date ? new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                                    </td>
                                                    <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-white">
                                                        {expense.description}
                                                    </td>
                                                    <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                                                        ₱ {parseFloat(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Subtotal Row */}
                                            <tr className="bg-gray-100 dark:bg-slate-800 font-bold">
                                                <td colSpan="2" className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-right text-gray-900 dark:text-white">
                                                    Sub Total:
                                                </td>
                                                <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-right text-blue-600 dark:text-blue-400">
                                                    ₱ {getCategoryTotal(category).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}

                        {/* Grand Total */}
                        <div className="mt-8 border-t-4 border-gray-900 dark:border-slate-300 pt-4">
                            <table className="w-full">
                                <tbody>
                                    <tr className="bg-yellow-100 dark:bg-yellow-900/30">
                                        <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-white">
                                            GRAND TOTAL:
                                        </td>
                                        <td className="px-4 py-3 text-right text-2xl font-bold text-blue-600 dark:text-blue-400" style={{ width: '200px' }}>
                                            ₱ {totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {expenses.length === 0 && (
                            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                                <p className="text-lg mb-2">No expenses to liquidate yet.</p>
                                <p className="text-sm">Add expenses to generate the liquidation report.</p>
                            </div>
                        )}

                        {/* Signature Section */}
                        <div className="mt-12 grid grid-cols-2 gap-8">
                            <div className="text-center">
                                <div className="border-t-2 border-gray-800 dark:border-slate-300 pt-2 mt-16">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Prepared by</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="border-t-2 border-gray-800 dark:border-slate-300 pt-2 mt-16">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Approved by</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Updates;
