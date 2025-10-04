import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const getToken = () => localStorage.getItem('token');

const Updates = () => {
    const { projectId } = useParams();
    const [expenses, setExpenses] = useState([]);
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

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
            date: new Date().toISOString()
        };

        try {
            await axios.post(`http://localhost:5001/api/expenses/${projectId}`, newExpense, config);
            setExpenseDescription('');
            setExpenseAmount('');
            setSuccessMessage('Expense added successfully!');
            await fetchExpenses();
            
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

    useEffect(() => {
        fetchExpenses();
    }, [projectId]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add New Expense</h2>
                
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
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Description
                        </label>
                        <input
                            type="text" 
                            id="description" 
                            value={expenseDescription} 
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Cement Purchase" 
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
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 50000"
                            step="0.01"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
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
                                    <td colSpan="3" className="text-center py-8 text-gray-500 dark:text-slate-400">
                                        No expenses logged yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Updates;