import React, { useState, useEffect } from 'react';
import { Mail, Clock, CheckCircle, XCircle, AlertTriangle, Search, Filter, Eye, Trash2, MessageSquare, Calendar, User, Tag, FileText } from 'lucide-react';
import api from '../services/api';

// Only custom animations not in Tailwind
const customStyles = `
  @keyframes float {
    0%, 100% { 
      transform: translateY(0px) translateX(0px); 
      opacity: 0.3; 
    }
    25% { 
      transform: translateY(-20px) translateX(10px); 
      opacity: 0.5; 
    }
    50% { 
      transform: translateY(-40px) translateX(-10px); 
      opacity: 0.7; 
    }
    75% { 
      transform: translateY(-20px) translateX(5px); 
      opacity: 0.5; 
    }
  }
  
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
`;;

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Inject custom styles
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = customStyles;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/support-tickets${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`);
      setTickets(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketNumber, newStatus, priority, adminNotes) => {
    try {
      const response = await api.patch(`/support-tickets/${ticketNumber}`, { 
        status: newStatus, 
        priority, 
        adminNotes 
      });
      
      setTickets(tickets.map(ticket => 
        ticket.ticketNumber === ticketNumber 
          ? response.data.data
          : ticket
      ));
      
      setShowModal(false);
      setSelectedTicket(null);
      
      // Success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.textContent = '✓ Ticket updated successfully!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('Failed to update ticket: ' + (error.response?.data?.message || error.message));
    }
  };

  const deleteTicket = async (ticketNumber) => {
    if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/support-tickets/${ticketNumber}`);
      setTickets(tickets.filter(ticket => ticket.ticketNumber !== ticketNumber));
      
      // Success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.textContent = '✓ Ticket deleted successfully!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Failed to delete ticket');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/40 shadow-lg shadow-yellow-500/10',
      'in-progress': 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/40 shadow-lg shadow-blue-500/10',
      resolved: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 border-green-500/40 shadow-lg shadow-green-500/10',
      closed: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-300 border-gray-500/40 shadow-lg shadow-gray-500/10'
    };
    
    const icons = {
      pending: <Clock className="w-3.5 h-3.5" />,
      'in-progress': <AlertTriangle className="w-3.5 h-3.5" />,
      resolved: <CheckCircle className="w-3.5 h-3.5" />,
      closed: <XCircle className="w-3.5 h-3.5" />
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${styles[status]} transition-all duration-200 hover:scale-105`}>
        {icons[status]}
        {status.replace('-', ' ').toUpperCase()}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
      normal: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      high: 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
    };

    const dots = {
      low: '●',
      normal: '●●',
      high: '●●●'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${styles[priority]} transition-all duration-200`}>
        <span className="text-[10px]">{dots[priority]}</span>
        {priority.toUpperCase()}
      </span>
    );
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'pending').length,
    inProgress: tickets.filter(t => t.status === 'in-progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden p-6">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating Particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400/30 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-1 h-1 bg-pink-400/30 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-60 right-1/3 w-2 h-2 bg-cyan-400/30 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Enhanced Header with glass effect */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-2xl"></div>
          <div className="relative bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/50">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-1">
                  Support Tickets
                </h1>
                <p className="text-gray-400 text-lg">Manage and respond to customer support requests</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2">
              Support Tickets
            </h1>
            <p className="text-gray-400 text-lg">Manage and respond to customer support requests</p>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Total Tickets</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-7 h-7 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock className="w-7 h-7 text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 hover:border-blue-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-400/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">In Progress</p>
                <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
              </div>
              <div className="w-14 h-14 bg-blue-400/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-7 h-7 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-400">{stats.resolved}</p>
              </div>
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle className="w-7 h-7 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-5 mb-6 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets by number, name, email, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-3 bg-gray-800/30 px-4 rounded-xl border border-gray-700">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent border-none text-white focus:outline-none focus:ring-0 py-3 cursor-pointer font-medium"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modern Card-Based Tickets List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500 mb-4"></div>
              <p className="text-gray-400 text-lg">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-12 text-center">
              <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No tickets found</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.ticketNumber}
                className="group bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Left Section */}
                  <div className="flex-1 space-y-4">
                    {/* Header Row */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-blue-500/30 flex-shrink-0">
                        <Mail className="w-6 h-6 text-blue-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">
                            {ticket.ticketNumber}
                          </span>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">
                          {ticket.subject}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium text-gray-300">{ticket.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            <span>{ticket.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            <span className="text-xs">ID: {ticket.accountId}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Message Preview */}
                    <div className="ml-16 bg-gray-800/30 rounded-lg p-3 border border-gray-700/30">
                      <p className="text-gray-400 text-sm line-clamp-2">{ticket.message}</p>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="flex flex-col items-end gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700/30">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(ticket.timestamp).toLocaleDateString()}</span>
                      <span className="text-gray-600">•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(ticket.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowModal(true);
                        }}
                        className="group/btn p-3 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-all duration-200 border border-blue-500/20 hover:border-blue-500/40 hover:scale-105"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteTicket(ticket.ticketNumber)}
                        className="group/btn p-3 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all duration-200 border border-red-500/20 hover:border-red-500/40 hover:scale-105"
                        title="Delete Ticket"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ticket Detail Modal */}
        {showModal && selectedTicket && (
          <TicketDetailModal
            ticket={selectedTicket}
            onClose={() => {
              setShowModal(false);
              setSelectedTicket(null);
            }}
            onUpdate={updateTicketStatus}
          />
        )}
      </div>
    </div>
  );
};

// Enhanced Modal Component
const TicketDetailModal = ({ ticket, onClose, onUpdate }) => {
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [adminNotes, setAdminNotes] = useState(ticket.adminNotes || '');

  const handleUpdate = () => {
    onUpdate(ticket.ticketNumber, status, priority, adminNotes);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 border-b border-gray-700/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Ticket Details
              </h2>
              <p className="text-blue-400 font-mono text-sm mt-1 font-bold">{ticket.ticketNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6 space-y-6">
          {/* Customer Info Card */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 hover:border-gray-600/50 transition-colors">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-1">Name</p>
                <p className="text-white font-semibold">{ticket.name}</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-1">Email</p>
                <p className="text-white font-semibold">{ticket.email}</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-1">Account ID</p>
                <p className="text-white font-semibold">{ticket.accountId}</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-1">Submitted</p>
                <p className="text-white font-semibold text-sm">
                  {new Date(ticket.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Content Card */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5 hover:border-gray-600/50 transition-colors">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              Ticket Content
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-2">Subject</p>
                <p className="text-white font-semibold text-lg">{ticket.subject}</p>
              </div>
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/30">
                <p className="text-gray-400 text-xs mb-2">Message</p>
                <p className="text-white leading-relaxed">{ticket.message}</p>
              </div>
            </div>
          </div>

          {/* Update Form */}
          <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-lg">Update Ticket Status</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows="4"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                placeholder="Add internal notes about this ticket..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-6 py-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/50 hover:scale-[1.02]"
            >
              Update Ticket
            </button>
            <button
              onClick={onClose}
              className="px-6 py-4 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl font-semibold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;