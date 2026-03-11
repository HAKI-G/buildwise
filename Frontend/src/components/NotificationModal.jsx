import React, { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info, AlertCircle } from 'lucide-react';

/**
 * Reusable Notification Modal — replaces all alert() and window.confirm() calls
 * Types: success, error, warning, info, confirm
 */

const iconMap = {
  success: { icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-200 dark:ring-green-800' },
  error: { icon: XCircle, bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-200 dark:ring-red-800' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-200 dark:ring-yellow-800' },
  info: { icon: Info, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800' },
  confirm: { icon: AlertCircle, bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-800' },
};

const titleMap = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Notice',
  confirm: 'Confirm Action',
};

const NotificationModal = ({ isOpen, type = 'info', title, message, onClose, onConfirm, confirmText, cancelText }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Focus trap
      modalRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const config = iconMap[type] || iconMap.info;
  const IconComponent = config.icon;
  const displayTitle = title || titleMap[type] || 'Notice';
  const isConfirmType = type === 'confirm';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-modalIn border border-gray-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full ${config.bg} ring-4 ${config.ring} flex items-center justify-center`}>
              <IconComponent className={`w-8 h-8 ${config.text}`} />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-center text-gray-900 dark:text-white mb-2">
            {displayTitle}
          </h3>

          {/* Message */}
          <p className="text-sm text-center text-gray-600 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Buttons */}
        <div className={`px-6 pb-6 ${isConfirmType ? 'flex gap-3' : 'flex justify-center'}`}>
          {isConfirmType ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => { onConfirm?.(); onClose?.(); }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg"
              >
                {confirmText || 'Confirm'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`px-8 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg text-white ${
                type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' :
                type === 'error' ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600' :
                type === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600' :
                'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
              }`}
            >
              OK
            </button>
          )}
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modalIn {
          animation: modalIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NotificationModal;
