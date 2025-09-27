import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout.jsx';

// Helper to get token
const getToken = () => localStorage.getItem('token');

// Reusable component for the key-value pairs in the project profile
const ProfileItem = ({ label, value }) => (
    <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
        <div className="text-lg font-medium text-gray-800 truncate">{value}</div>
    </div>
);

// Reusable component for the tab buttons
const TabButton = ({ label, activeTab, setActiveTab }) => (
    <button
        onClick={() => setActiveTab(label.toLowerCase())}
        className={`px-4 py-2 font-semibold text-sm rounded-t-lg focus:outline-none transition-colors duration-200 ${
            activeTab === label.toLowerCase()
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
        }`}
    >
        {label}
    </button>
);

function ProjectDetailPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    // --- State Management ---
    const [project, setProject] = useState(null);
    const [milestones, setMilestones] = useState([]);
    const [expenses, setExpenses] = useState([]); // State for expenses
    // Placeholders for future data
    const [updates, setUpdates] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [comments, setComments] = useState([]);

    const [activeTab, setActiveTab] = useState('milestones');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for the "Add Expense" form
    const [expenseDescription, setExpenseDescription] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching ---
    const fetchProjectData = useCallback(async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };

        setLoading(true);
        try {
            // Fetch project and milestones first (these are working)
            const [projectRes, milestonesRes] = await Promise.all([
                axios.get(`http://localhost:5001/api/projects/${projectId}`, config),
                axios.get(`http://localhost:5001/api/milestones/project/${projectId}`, config),
            ]);
            
            setProject(projectRes.data);
            setMilestones(milestonesRes.data);
            
            // Try to fetch expenses, but handle 404 gracefully
            try {
                const expensesRes = await axios.get(`http://localhost:5001/api/expenses/project/${projectId}`, config);
                setExpenses(expensesRes.data);
            } catch (expenseError) {
                if (expenseError.response?.status === 404) {
                    console.warn('Expenses endpoint not found, setting empty array');
                    setExpenses([]);
                } else {
                    throw expenseError; // Re-throw if it's not a 404
                }
            }
            
        } catch (err) {
            if (err.response && err.response.status === 401) {
                navigate('/login');
            } else {
                setError('Failed to fetch project details.');
            }
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }, [projectId, navigate]);

    useEffect(() => {
        fetchProjectData();
    }, [fetchProjectData]);

    // --- Event Handler for Adding Expense ---
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
            // Use the exact endpoint structure from your backend
            const response = await axios.post(`http://localhost:5001/api/expenses/${projectId}`, newExpense, config);
            
            setExpenseDescription('');
            setExpenseAmount('');
            await fetchProjectData(); // Re-fetch all data to show the new expense
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


    // --- Render Logic ---
    if (loading) return <Layout title="Loading..."><p className="text-center p-8">Loading project details...</p></Layout>;
    if (error) return <Layout title="Error"><p className="text-center text-red-500 p-8">{error}</p></Layout>;

    return (
        <Layout title={project ? project.name : 'Project Details'}>
            
            {/* --- Project Profile Section --- */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-6 shadow-sm">
                <ProfileItem label="Project Name" value={project?.name || 'N/A'} />
                <ProfileItem label="Location" value={project?.location || 'N/A'} />
                <ProfileItem label="Contractor" value={project?.contractor || 'N/A'} />
                <ProfileItem label="Date Started" value={project?.dateStarted ? new Date(project.dateStarted).toLocaleDateString() : 'N/A'} />
                <ProfileItem label="Completion Date" value={project?.contractCompletionDate ? new Date(project.contractCompletionDate).toLocaleDateString() : 'N/A'} />
                <ProfileItem label="Contract Cost (PHP)" value={`₱${project?.contractCost?.toLocaleString() || 'N/A'}`} />
                <ProfileItem label="Construction Consultant" value={project?.constructionConsultant || 'N/A'} />
                <ProfileItem label="Implementing Office" value={project?.implementingOffice || 'N/A'} />
                <ProfileItem label="Sources of Fund" value={project?.sourcesOfFund || 'N/A'} />
                <ProfileItem label="Project Manager" value={project?.projectManager || 'N/A'} />
            </div>

            {/* --- Interactive Tabs Section --- */}
            <div>
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <TabButton label="Milestones" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Updates" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Photos" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Comments" activeTab={activeTab} setActiveTab={setActiveTab} />
                        <TabButton label="Documents" activeTab={activeTab} setActiveTab={setActiveTab} />
                    </nav>
                </div>

                <div className="py-6">
                    {/* Milestones Content */}
                    {activeTab === 'milestones' && (
                        <div className="space-y-4">
                            {milestones.length > 0 ? (
                                milestones.map(m => (
                                    <div key={m.milestoneId} className="bg-white p-4 rounded-lg border shadow-sm">
                                        <h3 className="font-bold text-gray-800">{m.milestoneName} <span className="text-sm font-medium text-gray-500">({m.status})</span></h3>
                                        <p className="text-gray-600 mt-1">{m.description}</p>
                                    </div>
                                ))
                            ) : (<p className="text-center text-gray-500 py-8">No milestones for this project yet.</p>)}
                        </div>
                    )}

                    {/* Updates Content - now includes expenses */}
                    {activeTab === 'updates' && (
                        <div className="space-y-8">
                            {/* Progress Updates Section */}
                            <div className="bg-white p-6 rounded-xl border shadow-sm">
                                <h2 className="text-xl font-bold mb-4">Progress Updates</h2>
                                <div className="text-center text-gray-500 py-8">
                                    <p>Progress updates will be shown here.</p>
                                </div>
                            </div>

                            {/* Expenses Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1 bg-white p-6 rounded-xl border shadow-sm">
                                    <h2 className="text-xl font-bold mb-4">Add New Expense</h2>
                                    <form onSubmit={handleAddExpense}>
                                        <div className="mb-4">
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                                            <input
                                                type="text" id="description" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="e.g., Cement Purchase" />
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (PHP)</label>
                                            <input
                                                type="number" id="amount" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="e.g., 50000" />
                                        </div>
                                        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
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
                        </div>
                    )}
                    
                    {/* Placeholder Content */}
                    {activeTab === 'photos' && ( <div className="text-center text-gray-500 py-8"><p>Photo Gallery will be shown here.</p></div> )}
                    {activeTab === 'comments' && ( <div className="text-center text-gray-500 py-8"><p>Comments will be shown here.</p></div> )}
                    {activeTab === 'documents' && ( <div className="text-center text-gray-500 py-8"><p>Project Documents will be shown here.</p></div> )}
                </div>
            </div>
        </Layout>
    );
}

export default ProjectDetailPage;