import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import axios from 'axios';

const getToken = () => localStorage.getItem('token');

function StatusDropdown({ projectId, currentStatus, onStatusChange }) {
    const [isUpdating, setIsUpdating] = useState(false);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed':
                return 'bg-green-500/20 text-green-100 border-green-400';
            case 'In Progress':
                return 'bg-blue-500/20 text-blue-100 border-blue-400';
            case 'Overdue':
                return 'bg-red-500/20 text-red-100 border-red-400';
            case 'On Hold':
                return 'bg-orange-500/20 text-orange-100 border-orange-400';
            default:
                return 'bg-yellow-500/20 text-yellow-100 border-yellow-400';
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        setIsUpdating(true);
        const token = getToken();
        
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            await axios.patch(
                `http://localhost:5001/api/projects/${projectId}`,
                { status: newStatus },
                config
            );
            
            // Call parent callback to update UI
            onStatusChange(newStatus);
            
            console.log('✅ Status updated to:', newStatus);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status. Please try again.');
        } finally {
            setIsUpdating(false);
        }
    };

    const displayStatus = currentStatus || 'Not Started';

    return (
        <div className="relative group">
            <button 
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 flex items-center gap-2 ${getStatusColor(displayStatus)} hover:opacity-80 transition-all`}
                disabled={isUpdating}
            >
                {isUpdating ? 'Updating...' : displayStatus}
                <ChevronDown className="w-4 h-4" />
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="py-2">
                    {['Not Started', 'In Progress', 'Completed', 'On Hold', 'Overdue'].map((status) => (
                        <button
                            key={status}
                            onClick={() => handleStatusUpdate(status)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                                displayStatus === status 
                                    ? 'bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold' 
                                    : 'text-gray-700 dark:text-slate-300'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default StatusDropdown;