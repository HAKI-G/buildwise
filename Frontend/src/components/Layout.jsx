import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import logo from '../images/logo.png';
import { useTheme } from '../context/ThemeContext';
import { 
    Settings, 
    Moon, 
    Sun, 
    Menu,
    X,
    LayoutDashboard,
    BarChart3,
    FolderKanban,
    LogOut,
    Bell,
    CheckCheck,
    Inbox,
    Clock,
    Tag,
    ExternalLink,
    Megaphone,
    AlertTriangle,
    Info,
    DollarSign,
    Wrench
} from 'lucide-react';
import SupportTicketWidget from './SupportTicketWidget';

function Layout({ title, children, headerContent }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifTab, setNotifTab] = useState('new');
    const [detailNotif, setDetailNotif] = useState(null);
    const notificationRef = useRef(null);

    const [userInfo, setUserInfo] = useState({
        name: 'User',
        role: 'User',
        avatar: ''
    });

    useEffect(() => {
        const handleResize = () => {
            const desktop = window.innerWidth >= 1024;
            setIsDesktop(desktop);
            if (desktop) setSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!isDesktop) setSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const userName = localStorage.getItem('userName') || 'User';
        const userRole = localStorage.getItem('userRole') || 'User';
        const userAvatar = localStorage.getItem('userAvatar') || '';
        setUserInfo({ name: userName, role: userRole, avatar: userAvatar });
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(
                `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/notifications`,
                config
            );
            const data = res.data;
            setNotifications(Array.isArray(data) ? data : (Array.isArray(data?.notifications) ? data.notifications : []));
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markNotificationRead = async (notificationId) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(
                `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/notifications/read`,
                { notificationId },
                config
            );
            setNotifications(prev => Array.isArray(prev) ? prev.map(n => 
                n.notificationId === notificationId ? { ...n, read: true } : n
            ) : []);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllNotificationsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.put(
                `${process.env.REACT_APP_API_URL || 'http://54.251.28.81'}/api/notifications/read-all`,
                {},
                config
            );
            setNotifications(prev => Array.isArray(prev) ? prev.map(n => ({ ...n, read: true })) : []);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;
    const readCount = Array.isArray(notifications) ? notifications.filter(n => n.read).length : 0;
    const filteredNotifications = Array.isArray(notifications) 
        ? notifications.filter(n => notifTab === 'new' ? !n.read : n.read) 
        : [];

    const handleNotificationClick = (notif) => {
        if (!notif.read) markNotificationRead(notif.notificationId);
        setDetailNotif(notif);
        setShowNotifications(false);
    };

    const handleDetailNavigate = (notif) => {
        if (notif.metadata?.projectId) {
            navigate(`/projects/${notif.metadata.projectId}`);
        } else if (notif.type === 'expense' || notif.type === 'budget_alert') {
            navigate('/projects');
        } else {
            navigate('/dashboard');
        }
        setDetailNotif(null);
    };

    const getNotifIcon = (type) => {
        switch (type) {
            case 'announcement': return <Megaphone className="w-5 h-5" />;
            case 'expense': case 'budget_alert': return <DollarSign className="w-5 h-5" />;
            case 'system': case 'maintenance': return <Wrench className="w-5 h-5" />;
            case 'warning': case 'alert': return <AlertTriangle className="w-5 h-5" />;
            default: return <Info className="w-5 h-5" />;
        }
    };

    const getNotifColor = (type) => {
        switch (type) {
            case 'announcement': return 'bg-blue-500';
            case 'expense': case 'budget_alert': return 'bg-amber-500';
            case 'system': case 'maintenance': return 'bg-gray-500';
            case 'warning': case 'alert': return 'bg-red-500';
            default: return 'bg-indigo-500';
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('userId');
        localStorage.removeItem('lastSelectedProjectId');
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
    };

    const RobotIcon = ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="3" />
            <circle cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 3v2" /><path d="M10 3h4" />
            <path d="M8.5 11V9a3.5 3.5 0 0 1 7 0v2" />
        </svg>
    );

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/projects', icon: FolderKanban, label: 'Projects' },
        { path: '/statistics', icon: BarChart3, label: 'Statistics' },
        { path: '/ai-advisor', icon: RobotIcon, label: 'BW Advisor' },
    ];

    const navLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors";
    const activeNavLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg font-bold bg-white dark:bg-slate-700 text-black dark:text-white shadow-sm";

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-white transition-colors duration-200">
            
            {/* Mobile Overlay */}
            {sidebarOpen && !isDesktop && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50
                w-64 bg-stone-100 dark:bg-slate-800 p-6 flex flex-col justify-between 
                border-r border-gray-200 dark:border-slate-700 transition-all duration-300 overflow-y-auto
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div>
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center space-x-3">
                            <img src={logo} alt="BuildWise Logo" className="h-10 w-auto object-contain" />
                            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">BuildWise</h1>
                        </div>
                        {!isDesktop && (
                            <button 
                                onClick={() => setSidebarOpen(false)}
                                className="p-1.5 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => {
                                    const isMatch = isActive || 
                                        (item.path === '/projects' && location.pathname.startsWith('/projects')) ||
                                        (item.path === '/statistics' && location.pathname.startsWith('/statistics'));
                                    return isMatch ? activeNavLinkClasses : navLinkClasses;
                                }}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </nav>
                </div>
                
                <div className="space-y-1">
                    <NavLink 
                        to="/settings" 
                        className={({ isActive }) => isActive ? activeNavLinkClasses : navLinkClasses}
                    >
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </NavLink>
                    <button onClick={handleLogout} className={navLinkClasses}>
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main content — no top header bar */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* Mobile-only top bar (just hamburger + title) */}
                <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold text-gray-800 dark:text-white truncate">{title || 'BuildWise'}</h1>
                </div>

                <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto h-full">
                    {children}
                </div>
            </main>

            {/* Support Ticket Floating Widget */}
            <SupportTicketWidget />

            {/* Notification Detail Modal */}
            {detailNotif && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setDetailNotif(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-2xl border border-gray-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-b border-gray-200 dark:border-slate-700 px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl text-white ${getNotifColor(detailNotif.type)}`}>
                                        {getNotifIcon(detailNotif.type)}
                                    </div>
                                    <div>
                                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 mb-1">
                                            {detailNotif.type || 'notification'}
                                        </span>
                                        <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                            {detailNotif.title || detailNotif.type || 'Notification'}
                                        </h2>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDetailNotif(null)}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors flex-shrink-0"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {/* Body */}
                        <div className="px-5 py-5 overflow-y-auto max-h-[50vh]">
                            <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                {detailNotif.message || 'No content available.'}
                            </p>
                        </div>
                        {/* Footer */}
                        <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
                                <Clock className="w-3.5 h-3.5" />
                                {detailNotif.createdAt ? new Date(detailNotif.createdAt).toLocaleString() : 'Unknown date'}
                            </div>
                            <div className="flex items-center gap-2">
                                {(detailNotif.metadata?.projectId || detailNotif.type === 'expense' || detailNotif.type === 'budget_alert') && (
                                    <button
                                        onClick={() => handleDetailNavigate(detailNotif)}
                                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        Go to {detailNotif.metadata?.projectId ? 'Project' : 'Projects'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setDetailNotif(null)}
                                    className="px-3 py-1.5 text-xs font-medium bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Layout;