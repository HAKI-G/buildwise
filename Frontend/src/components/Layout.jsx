Layout.jsx

import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import logo from '../images/logo.png';
import { useTheme } from '../context/ThemeContext';
import { 
    Settings, 
    Moon, 
    Sun, 
    ChevronDown, 
    ChevronRight,
    PieChart,
    CheckSquare,
    Clock,
    Target,
    FileText,
    Camera,
    BarChart3,
    MessageSquare,
    FolderOpen,
    Map,
    Sparkles
} from 'lucide-react';

const DashboardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const StatsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" />
  </svg>
);

const ProjectsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

function Layout({ title, children, headerContent }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    
    const [userInfo, setUserInfo] = useState({
        name: 'User',
        role: 'User',
        avatar: ''
    });

    const [openMenus, setOpenMenus] = useState({
        statistics: true,
        projects: true
    });

    // ✅ FIXED: Get current project ID from URL ONLY
const getCurrentProjectId = () => {
    const pathParts = location.pathname.split('/');
    
    // Check for /statistics/:projectId or /statistics/:projectId/...
    if (pathParts[1] === 'statistics' && pathParts[2]) {
        return pathParts[2];
    }
    
    // Check for /projects/:projectId/view/:section (our dedicated view routes)
    if (pathParts[1] === 'projects' && pathParts[3] === 'view' && pathParts[2]) {
        return pathParts[2];
    }
    
    // Check for /projects/:projectId (project detail page, but NOT /projects list)
    if (pathParts[1] === 'projects' && pathParts[2] && pathParts[2] !== 'edit' && pathParts.length > 2) {
        return pathParts[2];
    }
    
    // ✅ Don't use localStorage as fallback - return null if not on a project page
    return null;
};

    const currentProjectId = getCurrentProjectId();

    useEffect(() => {
        const userName = localStorage.getItem('userName') || 'User';
        const userRole = localStorage.getItem('userRole') || 'User';
        const userAvatar = localStorage.getItem('userAvatar') || '';
        
        setUserInfo({
            name: userName,
            role: userRole,
            avatar: userAvatar
        });
    }, []);

    const toggleMenu = (menuName) => {
        setOpenMenus(prev => ({
            ...prev,
            [menuName]: !prev[menuName]
        }));
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
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // ✅ Handle statistics submenu click
    const handleStatSubmenuClick = (page) => {
        if (currentProjectId) {
            navigate(`/statistics/${currentProjectId}/${page}`);
        } else {
            // If no project selected, go to statistics page to select one
            navigate('/statistics');
        }
    };

    // ✅ UPDATED: Handle project submenu click with project selection
    const handleProjectSubmenuClick = (section) => {
        if (currentProjectId) {
            // Navigate to dedicated view page (no tabs, no full header)
            navigate(`/projects/${currentProjectId}/view/${section}`);
        } else {
            // If no project selected, go to project selection page with section parameter
            navigate(`/select-project?section=${section}`);
        }
    };

    // ✅ NEW: Check if a submenu item is active (for dedicated view routes)
    const isProjectSubmenuActive = (section) => {
        const pathParts = location.pathname.split('/');
        // Check for /projects/:projectId/view/:section
        return pathParts[1] === 'projects' && pathParts[3] === 'view' && pathParts[4] === section;
    };

    const navLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors";
    const activeNavLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg font-bold bg-white dark:bg-slate-700 text-black dark:text-white shadow-sm";
    const subMenuLinkClasses = "w-full text-left flex items-center space-x-2 pl-12 pr-3 py-2 rounded-lg text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer";
    const activeSubMenuLinkClasses = "w-full text-left flex items-center space-x-2 pl-12 pr-3 py-2 rounded-lg text-sm font-semibold bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white cursor-pointer";

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-white transition-colors duration-200">
            <aside className="w-64 bg-stone-100 dark:bg-slate-800 p-6 flex flex-col justify-between border-r border-gray-200 dark:border-slate-700 transition-colors overflow-y-auto">
                <div>
                    <div className="flex items-center justify-center space-x-3 mb-12">
                        <img
                            src={logo}
                            alt="BuildWise Logo"
                            className="h-12 w-auto object-contain"
                        />
                        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">BuildWise</h1>
                        </div>

                    <nav className="space-y-2">
                        {/* Dashboard */}
                        <NavLink 
                            to="/dashboard" 
                            className={({ isActive }) => isActive ? activeNavLinkClasses : navLinkClasses}
                        >
                            <DashboardIcon />
                            <span>Dashboard</span>
                        </NavLink>
                        
                        {/* Statistics with Submenu */}
                        <div>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleMenu('statistics');
                                    if (!openMenus.statistics) {
                                        navigate('/statistics');
                                    }
                                }}
                                className={location.pathname.includes('/statistics') ? activeNavLinkClasses : navLinkClasses}
                            >
                                <StatsIcon />
                                <span className="flex-1">Statistics</span>
                                {openMenus.statistics ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </button>
                            
                            {/* Statistics Submenu */}
                            {openMenus.statistics && (
                                <div className="space-y-1 mt-1">
                                    <div 
                                        onClick={() => handleStatSubmenuClick('milestone-status')} 
                                        className={location.pathname.includes('milestone-status') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <PieChart className="w-4 h-4" />
                                        <span>Milestone Status</span>
                                    </div>
                                    <div 
                                        onClick={() => handleStatSubmenuClick('task-priority')} 
                                        className={location.pathname.includes('task-priority') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <CheckSquare className="w-4 h-4" />
                                        <span>Task Priority</span>
                                    </div>
                                    <div 
                                        onClick={() => handleStatSubmenuClick('pending-tasks')} 
                                        className={location.pathname.includes('pending-tasks') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <Clock className="w-4 h-4" />
                                        <span>Pending Tasks</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Projects with Submenu */}
                        <div>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleMenu('projects');
                                    if (!openMenus.projects) {
                                        navigate('/projects');
                                    }
                                }}
                                className={location.pathname.includes('/projects') ? activeNavLinkClasses : navLinkClasses}
                            >
                                <ProjectsIcon />
                                <span className="flex-1">Projects</span>
                                {openMenus.projects ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </button>
                            
                            {/* ✅ Projects Submenu - Dedicated view pages */}
                            {openMenus.projects && (
                                <div className="space-y-1 mt-1">
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('milestones')} 
                                        className={isProjectSubmenuActive('milestones') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <Target className="w-4 h-4" />
                                        <span>Milestones</span>
                                    </div>
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('updates')} 
                                        className={isProjectSubmenuActive('updates') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>Updates</span>
                                    </div>
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('photos')} 
                                        className={isProjectSubmenuActive('photos') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Photos</span>
                                    </div>
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('reports')} 
                                        className={isProjectSubmenuActive('reports') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        <span>Reports</span>
                                    </div>
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('comments')} 
                                        className={isProjectSubmenuActive('comments') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span>Comments</span>
                                    </div>
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('documents')} 
                                        className={isProjectSubmenuActive('documents') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        <span>Documents</span>
                                    </div>
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('maps')} 
                                        className={isProjectSubmenuActive('maps') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <Map className="w-4 h-4" />
                                        <span>Maps</span>
                                    </div>
                                    {/* ✅ Generate Report */}
                                    <div 
                                        onClick={() => handleProjectSubmenuClick('generate-report')} 
                                        className={isProjectSubmenuActive('generate-report') ? activeSubMenuLinkClasses : subMenuLinkClasses}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        <span>Generate Report</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
                
                <div>
                    <Link to="/settings" className={navLinkClasses}>
                        <SettingsIcon />
                        <span>Settings</span>
                    </Link>
                    <button onClick={handleLogout} className={navLinkClasses}>
                        <LogoutIcon />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4 transition-colors">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{title || 'BuildWise'}</h1>
                            {headerContent && <div className="flex-1">{headerContent}</div>}
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={toggleTheme}
                                className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                aria-label="Toggle theme"
                            >
                                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </button>

                            <button 
                                onClick={() => navigate('/settings')}
                                className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                aria-label="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>

                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <div className="font-bold text-gray-800 dark:text-white">{userInfo.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-slate-400">{userInfo.role}</div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                                    {userInfo.avatar ? (
                                        <img src={userInfo.avatar} alt={userInfo.name} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(userInfo.name)
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-8 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;