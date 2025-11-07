import React, { useState } from 'react';
import { Settings, Clock, AlertTriangle, ArrowLeft, Send, CheckCircle } from 'lucide-react';

const MaintenanceScreen = () => {
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    accountId: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateTicketNumber = () => {
    return 'TKT-' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.accountId || !formData.subject || !formData.message) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const ticket = generateTicketNumber();
      
      const ticketData = {
        ticketNumber: ticket,
        name: formData.name,
        email: formData.email,
        accountId: formData.accountId,
        subject: formData.subject,
        message: formData.message,
        timestamp: new Date().toISOString(),
        status: 'pending',
        priority: 'normal'
      };

      // Get API URL from environment variable or use default
      const API_URL = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/support-tickets`
        : 'http://localhost:5001/api/support-tickets';
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit ticket');
      }

      const result = await response.json();
      console.log('Ticket submitted successfully:', result);
      
      setTicketNumber(ticket);
      setIsSubmitted(true);
      
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit ticket. Please try again or contact support directly at buildwisecapstone@gmail.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowSupportForm(false);
    setIsSubmitted(false);
    setFormData({
      name: '',
      email: '',
      accountId: '',
      subject: '',
      message: ''
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 md:p-12">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="bg-green-500/20 rounded-full p-6">
                  <CheckCircle className="w-16 h-16 text-green-400" />
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Support Ticket Submitted
              </h1>
              
              <p className="text-gray-300 text-lg mb-6">
                Your ticket has been successfully submitted to our admin team.
              </p>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
                <p className="text-gray-400 text-sm mb-2">Your Ticket Number</p>
                <p className="text-2xl font-mono font-bold text-blue-400">{ticketNumber}</p>
                <p className="text-gray-400 text-sm mt-4">
                  Please save this number for reference. You will receive a confirmation email shortly.
                </p>
              </div>

              <button
                onClick={resetForm}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Back to Maintenance Screen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSupportForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 md:p-12">
            
            <button
              onClick={() => setShowSupportForm(false)}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
              Submit Support Ticket
            </h2>
            <p className="text-gray-300 mb-8">
              Our team will review your concern during maintenance and respond via email.
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Account ID or Username *
                </label>
                <input
                  type="text"
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Your BuildWise username or account ID"
                />
                <p className="text-gray-400 text-sm mt-2">
                  This helps us locate your account quickly
                </p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Brief description of your concern"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="6"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Please describe your concern in detail..."
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold px-6 py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        </div>

        {/* Main Card */}
        <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 md:p-12">
          
          {/* Icon Section */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-6">
                <Settings className="w-12 h-12 text-white animate-spin" style={{ animationDuration: '3s' }} />
              </div>
            </div>
          </div>

          {/* Alert Badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold text-sm uppercase tracking-wider">
              System Maintenance
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">
            We'll Be Right Back
          </h1>

          {/* Description */}
          <p className="text-gray-300 text-center text-lg mb-8 leading-relaxed">
            BuildWise is currently undergoing scheduled maintenance to improve your experience. 
            We'll be back online shortly.
          </p>

          {/* Status Box */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-semibold">Maintenance Details</h3>
            </div>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>System updates and performance improvements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>All your data is safe and secure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Expected completion time: Soon</span>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-4">
              Need urgent assistance?
            </p>
            <button
              onClick={() => setShowSupportForm(true)}
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              Contact Support
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Pulsing Indicator */}
          <div className="flex justify-center items-center gap-2 mt-8">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* BuildWise Logo/Text */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-sm">
            © 2025 BuildWise. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScreen;