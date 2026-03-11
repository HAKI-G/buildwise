import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../services/api';
import { 
  Send, Sparkles, AlertTriangle, TrendingUp, Shield, 
  Loader2, Plus, MessageSquare, Trash2, Clock, Search,
  Building2, FolderOpen, ChevronRight, X, ArrowUp, Zap,
  BarChart3, CalendarClock, HardHat, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const AIAdvisorPage = () => {
  const navigate = useNavigate();
  const notify = useNotification();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [quickInsights, setQuickInsights] = useState([]);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Session management state
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // User profile
  const [userAvatar, setUserAvatar] = useState('');
  const [userName, setUserName] = useState('User');

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all' or projectId
  const projectPickerRef = useRef(null);

  useEffect(() => {
    setUserAvatar(localStorage.getItem('userAvatar') || '');
    setUserName(localStorage.getItem('userName') || 'User');
    fetchProjects();
    fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedProject) {
      fetchQuickInsights(selectedProject);
    }
  }, [selectedProject]);

  // Close project picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (projectPickerRef.current && !projectPickerRef.current.contains(e.target)) {
        setShowProjectPicker(false);
        setProjectSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await api.get('/ai-advisor/sessions');
      setSessions(res.data.sessions || []);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadSession = async (sessionId) => {
    try {
      const res = await api.get(`/ai-advisor/sessions/${sessionId}`);
      if (res.data.success && res.data.session) {
        const session = res.data.session;
        setCurrentSessionId(session.sessionId);
        setMessages(session.messages || []);
        if (session.projectId) {
          setSelectedProject(session.projectId);
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
    setRiskAnalysis(null);
    inputRef.current?.focus();
  };

  const deleteSessionHandler = async (sessionId, e) => {
    e.stopPropagation();
    notify.confirm('Delete this conversation?', async () => {
      try {
        await api.delete(`/ai-advisor/sessions/${sessionId}`);
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        if (currentSessionId === sessionId) {
          startNewChat();
        }
        notify.success('Conversation deleted successfully');
      } catch (err) {
        console.error('Failed to delete session:', err);
        notify.error('Failed to delete conversation');
      }
    }, { title: 'Delete Conversation', confirmText: 'Delete', cancelText: 'Cancel' });
  };

  const fetchQuickInsights = async (projectId) => {
    try {
      const res = await api.get(`/ai-advisor/quick-insights/${projectId}`);
      setQuickInsights(res.data.insights || []);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setQuickInsights([]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai-advisor/chat', {
        question: userMessage.content,
        projectId: selectedProject || null,
        sessionId: currentSessionId || null
      });

      const aiMessage = {
        role: 'assistant',
        content: res.data.response,
        timestamp: res.data.timestamp || new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);

      if (res.data.sessionId) {
        setCurrentSessionId(res.data.sessionId);
      }
      fetchSessions();
    } catch (err) {
      console.error('AI Advisor error:', err);
      const errorMsg = {
        role: 'assistant',
        content: 'I apologize, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleRiskAnalysis = async () => {
    if (!selectedProject || riskLoading) return;
    setRiskLoading(true);
    setRiskAnalysis(null);
    setRightPanelOpen(true); // Auto-show right panel for results

    try {
      const res = await api.post(`/ai-advisor/risk-analysis/${selectedProject}`);
      setRiskAnalysis(res.data);
    } catch (err) {
      console.error('Risk analysis error:', err);
      setRiskAnalysis({ success: false, summary: 'Failed to generate risk analysis. Please try again.' });
    } finally {
      setRiskLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const suggestedPrompts = [
    { icon: <BarChart3 className="w-4 h-4" />, title: "Budget Analysis", desc: "How is the budget tracking vs progress?", color: "from-emerald-500 to-teal-600" },
    { icon: <AlertTriangle className="w-4 h-4" />, title: "Risk Assessment", desc: "What are the top risks right now?", color: "from-orange-500 to-red-500" },
    { icon: <CalendarClock className="w-4 h-4" />, title: "Schedule Review", desc: "What tasks should be prioritized?", color: "from-blue-500 to-indigo-600" },
    { icon: <HardHat className="w-4 h-4" />, title: "Safety Check", desc: "What safety precautions to focus on?", color: "from-purple-500 to-pink-600" },
  ];

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const selectedProjectData = projects.find(p => p.projectId === selectedProject);
  const filteredProjects = projects.filter(p => 
    (p.name || p.projectName || '').toLowerCase().includes(projectSearch.toLowerCase())
  );
  const filteredSessions = sessionFilter === 'all' 
    ? sessions 
    : sessions.filter(s => s.projectId === sessionFilter);

  // Right panel state
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const getInsightStyle = (type) => {
    switch (type) {
      case 'success': return 'border-green-200/60 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/10 text-green-700 dark:text-green-400';
      case 'warning': return 'border-amber-200/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400';
      case 'danger': return 'border-red-200/60 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10 text-red-700 dark:text-red-400';
      default: return 'border-blue-200/60 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400';
    }
  };

  return (
    <Layout title="AI Advisor">
      <div className="flex -m-4 sm:-m-6 lg:-m-8" style={{ height: 'calc(100vh - 73px)' }}>
        
        {/* ════════════ LEFT SIDEBAR ════════════ */}
        <div className={`${sidebarOpen ? 'w-72 xl:w-80' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-slate-700/50`}>
          <div className="w-72 xl:w-80 h-full flex flex-col bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
            
            {/* New Chat Button */}
            <div className="p-3 flex-shrink-0">
              <button
                onClick={startNewChat}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> New Conversation
              </button>
            </div>

            {/* Project Filter Dropdown */}
            <div className="px-3 pb-2 flex-shrink-0">
              <div className="relative">
                <select
                  value={sessionFilter}
                  onChange={(e) => setSessionFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600/50 rounded-lg text-[12px] font-medium text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none cursor-pointer pr-7 truncate"
                >
                  <option value="all">All Projects</option>
                  {projects.map(p => (
                    <option key={p.projectId} value={p.projectId}>
                      {(p.name || p.projectName || p.projectId).substring(0, 28)}
                    </option>
                  ))}
                </select>
                <FolderOpen className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 dark:text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto px-2">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Conversations ({filteredSessions.length})
              </p>
              {sessionsLoading ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">Loading...</span>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center py-10 px-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700/50 flex items-center justify-center mb-2">
                    <MessageSquare className="w-4 h-4 text-gray-300 dark:text-slate-600" />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center">
                    {sessionFilter === 'all' ? 'No conversations yet' : 'No chats for this project'}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 pb-2">
                  {filteredSessions.map(session => {
                    const sessionProject = projects.find(p => p.projectId === session.projectId);
                    return (
                      <div
                        key={session.sessionId}
                        onClick={() => loadSession(session.sessionId)}
                        className={`mx-1 px-3 py-2 cursor-pointer rounded-lg transition-all group ${
                          currentSessionId === session.sessionId 
                            ? 'bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-200/70 dark:ring-violet-700/40' 
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MessageSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                            currentSessionId === session.sessionId 
                              ? 'text-violet-500 dark:text-violet-400' 
                              : 'text-gray-300 dark:text-slate-600'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p 
                              title={session.title || 'Untitled Chat'}
                              className={`text-[13px] font-medium truncate leading-tight ${
                              currentSessionId === session.sessionId 
                                ? 'text-violet-900 dark:text-violet-200' 
                                : 'text-gray-700 dark:text-slate-300'
                            }`}>
                              {session.title || 'Untitled Chat'}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-gray-400 dark:text-slate-500">
                                {new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="text-gray-300 dark:text-slate-600 text-[8px]">·</span>
                              <span className="text-[10px] text-gray-400 dark:text-slate-500">{session.messageCount} msgs</span>
                              {sessionProject && (
                                <>
                                  <span className="text-gray-300 dark:text-slate-600 text-[8px]">·</span>
                                  <span className="text-[10px] text-violet-500 dark:text-violet-400 truncate max-w-[70px]">
                                    {(sessionProject.name || '').substring(0, 14)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteSessionHandler(session.sessionId, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-all rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-gray-100 dark:border-slate-700/30 flex-shrink-0">
              <div className="flex items-center gap-1.5 px-1">
                <Zap className="w-3 h-3 text-amber-500 flex-shrink-0" />
                <p className="text-[10px] text-gray-400 dark:text-slate-500">Powered by BuildWise AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════ CENTER: CHAT AREA ════════════ */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Bar */}
          <div className="flex-shrink-0 h-12 border-b border-gray-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center px-3 gap-2 z-10">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-500 dark:text-slate-400 transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="10" rx="3" />
                  <circle cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                  <path d="M12 3v2" /><path d="M10 3h4" />
                  <path d="M8.5 11V9a3.5 3.5 0 0 1 7 0v2" />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white hidden sm:inline">BuildWise AI Advisor</span>
            </div>

            <div className="flex-1" />

            {/* Project Selector Button */}
            <div className="relative" ref={projectPickerRef}>
              <button
                onClick={() => setShowProjectPicker(!showProjectPicker)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  selectedProject
                    ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300'
                    : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-violet-300'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="max-w-[160px] truncate hidden sm:inline">
                  {selectedProjectData ? (selectedProjectData.name || selectedProjectData.projectName) : 'Select Project'}
                </span>
                {selectedProject && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedProject(''); setShowProjectPicker(false); }}
                    className="p-0.5 hover:bg-violet-200 dark:hover:bg-violet-700 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </button>

              {/* Project Picker Dropdown */}
              {showProjectPicker && (
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/30 z-50 overflow-hidden">
                  <div className="p-2.5 border-b border-gray-100 dark:border-slate-700/50">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div
                    onClick={() => { setSelectedProject(''); setShowProjectPicker(false); setProjectSearch(''); }}
                    className={`px-3 py-2.5 cursor-pointer flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-slate-700/50 ${
                      !selectedProject ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">General Mode</p>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500">No project context</p>
                    </div>
                    {!selectedProject && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredProjects.map(p => (
                      <div
                        key={p.projectId}
                        onClick={() => { setSelectedProject(p.projectId); setShowProjectPicker(false); setProjectSearch(''); }}
                        className={`px-3 py-2.5 cursor-pointer flex items-center gap-3 transition-colors ${
                          selectedProject === p.projectId ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        {p.projectImage ? (
                          <img src={p.projectImage} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-800/30 dark:to-indigo-800/30 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name || p.projectName || p.projectId}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {p.status && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                p.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                p.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}>{p.status}</span>
                            )}
                            {p.location && <span className="text-[10px] text-gray-400 truncate">{p.location}</span>}
                          </div>
                        </div>
                        {selectedProject === p.projectId && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Risk Analysis Button */}
            {selectedProject && (
              <button
                onClick={handleRiskAnalysis}
                disabled={riskLoading}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm disabled:opacity-50 transition-all active:scale-[0.97]"
              >
                {riskLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                <span className="hidden md:inline">{riskLoading ? 'Analyzing...' : 'Risk Analysis'}</span>
              </button>
            )}

            {/* Toggle Right Panel */}
            {selectedProject && (
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-500 dark:text-slate-400 transition-colors"
                title={rightPanelOpen ? 'Hide panel' : 'Show panel'}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Chat + Right Panel Container */}
          <div className="flex-1 flex min-h-0">
            {/* Chat Messages */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-4">
                  
                  {/* ═══ WELCOME STATE ═══ */}
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[55vh] py-6">
                      <div className="relative mb-5 bot-float">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 flex items-center justify-center shadow-xl shadow-violet-500/25 bot-icon">
                          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="10" rx="3" />
                            <circle cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                            <circle cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                            <g>
                              <path d="M12 3v2" />
                              <path d="M10 3h4" />
                            </g>
                            <path d="M8.5 11V9a3.5 3.5 0 0 1 7 0v2" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                          <Zap className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">BuildWise AI Advisor</h2>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mb-6 max-w-sm text-center">
                        {selectedProject 
                          ? `Analyzing: ${selectedProjectData?.name || selectedProjectData?.projectName || 'Selected project'}` 
                          : 'Select a project for context-aware insights, or ask general questions.'}
                      </p>

                      {/* Quick Insights in Welcome */}
                      {selectedProject && quickInsights.length > 0 && (
                        <div className="w-full max-w-xl mb-5 space-y-1.5">
                          {quickInsights.slice(0, 3).map((insight, i) => (
                            <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${getInsightStyle(insight.type)}`}>
                              <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{insight.message}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Prompt Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
                        {suggestedPrompts.map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => { setInput(prompt.desc); inputRef.current?.focus(); }}
                            className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:border-violet-300 dark:hover:border-violet-600/50 hover:shadow-md text-left transition-all active:scale-[0.98]"
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${prompt.color} flex items-center justify-center flex-shrink-0 shadow group-hover:scale-105 transition-transform`}>
                              {React.cloneElement(prompt.icon, { className: 'w-3.5 h-3.5 text-white' })}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-800 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">{prompt.title}</p>
                              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{prompt.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Tip when no project */}
                      {!selectedProject && (
                        <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-700/30 max-w-xl w-full">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Select a project above to get AI insights based on your actual project data.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ═══ MESSAGES ═══ */
                    <div className="space-y-5 pb-2">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'assistant' && (
                            <div className={`w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 ${msg.error ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 bot-icon'}`}>
                              <svg className={`w-6 h-6 ${msg.error ? 'text-red-500' : 'text-white'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="10" rx="3" />
                                <circle className="bot-eye" cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                                <circle className="bot-eye-right" cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                                <g className="bot-antenna">
                                  <path d="M12 3v2" />
                                  <path d="M10 3h4" />
                                </g>
                                <path d="M8.5 11V9a3.5 3.5 0 0 1 7 0v2" />
                              </svg>
                            </div>
                          )}
                          <div className={`max-w-[78%] ${msg.role === 'user' ? '' : ''}`}>
                            <div className={`rounded-2xl px-4 py-2.5 ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow shadow-violet-500/15'
                                : msg.error 
                                  ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                                  : 'bg-white dark:bg-slate-800/80 text-gray-800 dark:text-slate-200 border border-gray-100 dark:border-slate-700/50 shadow-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                            <p className={`text-[10px] mt-1 px-1 ${
                              msg.role === 'user' ? 'text-right text-gray-400 dark:text-slate-500' : 'text-gray-400 dark:text-slate-500'
                            }`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 bg-gradient-to-br from-blue-500 to-cyan-500 shadow-md shadow-blue-500/25 overflow-hidden">
                              {userAvatar ? (
                                <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-white leading-none">
                                  {userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Typing indicator */}
                      {loading && (
                        <div className="flex gap-2.5">
                          <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-600 bot-icon-thinking">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="10" rx="3" />
                              <circle className="bot-eye" cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                              <circle className="bot-eye-right" cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
                              <g className="bot-antenna">
                                <path d="M12 3v2" />
                                <path d="M10 3h4" />
                              </g>
                              <path d="M8.5 11V9a3.5 3.5 0 0 1 7 0v2" />
                            </svg>
                          </div>
                          <div className="bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/50 rounded-2xl px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                              <span className="text-[11px] text-gray-400 dark:text-slate-500 ml-1.5">Thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ INPUT BAR — pinned to bottom ═══ */}
              <div className="flex-shrink-0 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 pb-3 pt-2">
                <div className="max-w-3xl mx-auto">
                  {selectedProject && selectedProjectData && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-200/60 dark:border-violet-700/40">
                        <Building2 className="w-2.5 h-2.5" />
                        {selectedProjectData.name || selectedProjectData.projectName}
                      </span>
                    </div>
                  )}
                  <div className="flex items-end gap-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700/50 rounded-xl p-1.5 shadow-sm focus-within:border-violet-400 dark:focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={selectedProjectData ? `Ask about ${selectedProjectData.name || selectedProjectData.projectName}...` : 'Ask about your construction project...'}
                      rows={1}
                      className="flex-1 px-2.5 py-2 bg-transparent text-gray-900 dark:text-white resize-none focus:outline-none text-sm placeholder-gray-400 dark:placeholder-slate-500 max-h-[150px]"
                      style={{ minHeight: '36px' }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || loading}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                        input.trim() && !loading
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-95'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-center text-[11px] text-gray-400 dark:text-slate-500 mt-1.5">
                    AI can make mistakes. Verify important decisions with your team.
                  </p>
                </div>
              </div>
            </div>

            {/* ════════════ RIGHT PANEL ════════════ */}
            {selectedProject && rightPanelOpen && (
              <div className="w-64 xl:w-72 flex-shrink-0 border-l border-gray-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm overflow-y-auto">
                <div className="p-3 space-y-3">

                  {/* Quick Insights */}
                  {quickInsights.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-violet-500" />
                        Quick Insights
                      </h3>
                      <div className="space-y-1.5">
                        {quickInsights.map((insight, i) => (
                          <div key={i} className={`text-[11px] p-2.5 rounded-lg border ${getInsightStyle(insight.type)}`}>
                            {insight.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Analysis Panel */}
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-orange-500" />
                      AI Risk Analysis
                    </h3>
                    <button
                      onClick={handleRiskAnalysis}
                      disabled={riskLoading}
                      className="w-full py-2 px-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      {riskLoading ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Analyzing...</>
                      ) : (
                        <><AlertTriangle className="w-3 h-3" /> Run Risk Analysis</>
                      )}
                    </button>

                    {riskAnalysis && (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500 dark:text-slate-400">Risk Level:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${getRiskColor(riskAnalysis.risk_level)}`}>
                            {riskAnalysis.risk_level || 'Unknown'}
                          </span>
                        </div>
                        {riskAnalysis.overall_health && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-500 dark:text-slate-400">Health:</span>
                            <span className="text-[11px] font-semibold text-gray-800 dark:text-white capitalize">{riskAnalysis.overall_health}</span>
                          </div>
                        )}
                        {riskAnalysis.summary && (
                          <div className="bg-gray-50 dark:bg-slate-900/30 rounded-lg p-2.5">
                            <p className="text-[11px] text-gray-700 dark:text-slate-300 leading-relaxed">{riskAnalysis.summary}</p>
                          </div>
                        )}
                        {riskAnalysis.risks && riskAnalysis.risks.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Risks</p>
                            {riskAnalysis.risks.slice(0, 4).map((risk, i) => (
                              <div key={i} className="bg-gray-50 dark:bg-slate-900/30 rounded-lg p-2">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold capitalize ${getRiskColor(risk.severity)}`}>
                                    {risk.severity}
                                  </span>
                                  {risk.category && <span className="text-[9px] text-gray-400 capitalize">{risk.category}</span>}
                                </div>
                                <p className="text-[11px] text-gray-700 dark:text-slate-300">{risk.description}</p>
                                {risk.mitigation && <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">→ {risk.mitigation}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                        {riskAnalysis.recommendations && riskAnalysis.recommendations.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Tips</p>
                            <ul className="space-y-0.5">
                              {riskAnalysis.recommendations.slice(0, 4).map((rec, i) => (
                                <li key={i} className="text-[11px] text-gray-600 dark:text-slate-400 flex items-start gap-1">
                                  <span className="text-violet-500 mt-0.5 flex-shrink-0">→</span> {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Capabilities */}
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/15 dark:to-indigo-900/15 rounded-xl border border-violet-200/60 dark:border-violet-700/30 p-3">
                    <h3 className="text-[11px] font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1.5 mb-2">
                      <Sparkles className="w-3 h-3" />
                      What I Can Help With
                    </h3>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-1.5 text-[11px] text-violet-700 dark:text-violet-300">
                        <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Budget tracking & expense analysis
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] text-violet-700 dark:text-violet-300">
                        <Shield className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Safety & risk assessment
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] text-violet-700 dark:text-violet-300">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Schedule delay predictions
                      </li>
                      <li className="flex items-start gap-1.5 text-[11px] text-violet-700 dark:text-violet-300">
                        <HardHat className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        Construction best practices
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AIAdvisorPage;
