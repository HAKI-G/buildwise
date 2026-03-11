import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import NotificationModal from '../components/NotificationModal';

const NotificationContext = createContext(null);

/**
 * Global notification provider — replaces all alert() and window.confirm() calls
 * 
 * Usage in any component:
 *   const notify = useNotification();
 *   notify.success('Operation completed!');
 *   notify.error('Something went wrong');
 *   notify.warning('Please check your input');
 *   notify.info('FYI some info here');
 *   notify.confirm('Are you sure?', () => { doDelete(); });
 */

export const NotificationProvider = ({ children }) => {
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null, confirmText: '', cancelText: '' });
  const confirmCallbackRef = useRef(null);

  const closeModal = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
    confirmCallbackRef.current = null;
  }, []);

  const showNotification = useCallback((type, message, title = '', options = {}) => {
    confirmCallbackRef.current = options.onConfirm || null;
    setModal({
      isOpen: true,
      type,
      title: title || '',
      message,
      confirmText: options.confirmText || '',
      cancelText: options.cancelText || '',
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmCallbackRef.current) {
      confirmCallbackRef.current();
    }
    closeModal();
  }, [closeModal]);

  const notify = {
    success: (message, title) => showNotification('success', message, title),
    error: (message, title) => showNotification('error', message, title),
    warning: (message, title) => showNotification('warning', message, title),
    info: (message, title) => showNotification('info', message, title),
    confirm: (message, onConfirm, options = {}) => showNotification('confirm', message, options.title || '', { onConfirm, confirmText: options.confirmText, cancelText: options.cancelText }),
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <NotificationModal
        isOpen={modal.isOpen}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={closeModal}
        onConfirm={handleConfirm}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
