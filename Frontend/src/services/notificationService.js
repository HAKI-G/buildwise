import api from './api';

/**
 * Send a phase completion notification
 * @param {string} projectId - Project ID
 * @param {string} phaseName - Name of the completed phase
 * @returns {Promise}
 */
export const sendPhaseCompletionNotification = async (projectId, phaseName) => {
    try {
        const response = await api.post('/notifications/phase-complete', {
            projectId,
            phaseName,
            message: `Phase "${phaseName}" has been completed successfully!`
        });
        return response.data;
    } catch (error) {
        console.error('Error sending phase completion notification:', error);
        throw error;
    }
};

/**
 * Send a task completion notification
 * @param {string} projectId - Project ID
 * @param {string} taskName - Name of the completed task
 * @returns {Promise}
 */
export const sendTaskCompletionNotification = async (projectId, taskName) => {
    try {
        const response = await api.post('/notifications/task-complete', {
            projectId,
            taskName,
            message: `Task "${taskName}" has been completed!`
        });
        return response.data;
    } catch (error) {
        console.error('Error sending task completion notification:', error);
        throw error;
    }
};

/**
 * Show a toast notification in the browser
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 */
export const showToast = (message, type = 'info') => {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    const bgColor = {
        success: '#10B981',
        error: '#EF4444',
        info: '#3B82F6',
        warning: '#F59E0B'
    };

    const textColor = '#FFFFFF';

    toast.style.cssText = `
        background-color: ${bgColor[type] || bgColor.info};
        color: ${textColor};
        padding: 16px 24px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease-out;
        min-width: 300px;
    `;

    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
};

export default {
    sendPhaseCompletionNotification,
    sendTaskCompletionNotification,
    showToast
};
