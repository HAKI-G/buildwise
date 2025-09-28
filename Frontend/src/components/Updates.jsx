import React, { useState } from 'react';
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

    const fetchExpenses = async () => {
        const token = getToken();
        if (!token) return;
        
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        try {
            const expensesRes = await axios.get(`http://localhost:5001/api/expenses/project/${projectId}`, config);
            setExpenses(expensesRes.data);
        } catch (expenseError) {
            if (expenseError.response?.status === 404) {
                console.warn('Expenses endpoint not found, setting empty array');
                setExpenses([]);
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
        const token = getToken();
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const newExpense = {
            description: expenseDescription,
            amount: parseFloat(expenseAmount),
        };

        try {
            await axios.post(`http://localhost:5001/api/expenses/${projectId}`, newExpense, config);
            setExpenseDescription('');
            setExpenseAmount('');
            await fetchExpenses();
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

    React.useEffect(() => {
        fetchExpenses();
    }, [projectId]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-xl font-bold mb-4">Add New Expense</h2>
                <form onSubmit={handleAddExpense}>
                    <div className="mb-4">
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <input
                            type="text" 
                            id="description" 
                            value={expenseDescription} 
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., Cement Purchase" 
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (PHP)</label>
                        <input
                            type="number" 
                            id="amount" 
                            value={expenseAmount} 
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., 50000" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Adding...' : 'Add Expense'}
                    </button>
                </form>
                {error && error.includes('not yet implemented') && (
                    <div className="mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                        <p className="text-sm">Note: Expense functionality needs to be implemented on the backend first.</p>
                    </div>
                )}
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-xl font-bold mb-4">Expense Log</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {expenses.length > 0 ? (
                                expenses.map((expense, index) => (
                                    <tr key={expense.expenseId || index}>
                                        <td className="px-6 py-4 whitespace-nowrap">{expense.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium">₱{expense.amount.toLocaleString()}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" className="text-center py-8 text-gray-500">No expenses logged yet.</td>
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