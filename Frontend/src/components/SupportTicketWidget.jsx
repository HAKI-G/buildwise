import React, { useState, useEffect, useRef } from 'react';
import { MessageCircleQuestion, X, Send, CheckCircle, ChevronDown, Headphones } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-green-600 dark:text-green-400' },
  { value: 'normal', label: 'Normal', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'high', label: 'High', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-600 dark:text-red-400' },
];

const SupportTicketWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [pulse, setPulse] = useState(true);
  const panelRef = useRef(null);
  const notify = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    accountId: '',
    subject: '',
    message: '',
    priority: 'normal',
  });

  // Auto-fill user info from localStorage
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: localStorage.getItem('userName') || '',
      email: localStorage.getItem('userEmail') || '',
      accountId: localStorage.getItem('userId') || '',
    }));
  }, []);

  // Stop pulse after first open
  useEffect(() => {
    if (isOpen) setPulse(false);
  }, [isOpen]);

  // Close panel on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Don't close if clicking the toggle button itself
        if (e.target.closest('[data-support-toggle]')) return;
        if (isOpen && !isSubmitting) setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isSubmitting]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateTicketNumber = () => {
    return 'TKT-' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.subject.trim() || !formData.message.trim()) {
      notify.warning('Please fill in the subject and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = generateTicketNumber();
      const API_URL = `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/support-tickets`;

      const ticketData = {
        ticketNumber: ticket,
        name: formData.name,
        email: formData.email,
        accountId: formData.accountId,
        subject: formData.subject,
        message: formData.message,
        timestamp: new Date().toISOString(),
        status: 'pending',
        priority: formData.priority,
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) throw new Error('Failed to submit ticket');

      setTicketNumber(ticket);
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      notify.error('Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setTicketNumber('');
    setFormData(prev => ({
      ...prev,
      subject: '',
      message: '',
      priority: 'normal',
    }));
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset after close animation
    setTimeout(() => {
      if (isSubmitted) resetForm();
    }, 300);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        data-support-toggle
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 group
          ${isOpen 
            ? 'bg-gray-600 dark:bg-slate-600 hover:bg-gray-700 dark:hover:bg-slate-500 rotate-0' 
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-110 hover:shadow-xl'
          }
        `}
        aria-label={isOpen ? 'Close support' : 'Submit support ticket'}
        title={isOpen ? 'Close' : 'Need help? Submit a support ticket'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <Headphones className="w-6 h-6 text-white" />
            {pulse && (
              <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30" />
            )}
          </>
        )}
      </button>

      {/* Tooltip on hover (when closed) */}
      {!isOpen && (
        <div className="fixed bottom-[5.5rem] right-6 z-[60] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          {/* This tooltip is handled by the group hover above, but as a fallback we'll use CSS */}
        </div>
      )}

      {/* Support Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-6 z-[59] w-[22rem] sm:w-[24rem] transition-all duration-300 origin-bottom-right
          ${isOpen 
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
          }
        `}
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[calc(100vh-10rem)]">
          
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Support Ticket</h3>
                  <p className="text-blue-100 text-[11px]">We typically respond within 24-48 hrs</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          {isSubmitted ? (
            /* Success State */
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Ticket Submitted!</h4>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Our team will review it and respond via email.
              </p>
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 mb-5">
                <p className="text-[11px] text-gray-400 dark:text-slate-500 uppercase tracking-wide font-medium mb-1">Your Ticket Number</p>
                <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400 select-all">{ticketNumber}</p>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-2">Save this for your reference</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors"
                >
                  New Ticket
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {/* User info (read-only, compact) */}
                <div className="bg-gray-50 dark:bg-slate-700/40 rounded-xl px-3.5 py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {formData.name ? formData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{formData.name || 'User'}</p>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">{formData.email || 'No email'}</p>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Brief description of your issue"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                    maxLength={120}
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Priority</label>
                  <div className="flex gap-1.5">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priority: p.value }))}
                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          formData.priority === p.value
                            ? p.value === 'low' ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400'
                            : p.value === 'normal' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400'
                            : p.value === 'high' ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400'
                            : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                            : 'bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                    required
                    maxLength={2000}
                  />
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 text-right mt-0.5">{formData.message.length}/2000</p>
                </div>
              </div>

              {/* Submit Footer */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default SupportTicketWidget;
