import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Settings, Moon, Sun } from 'lucide-react';


const DashboardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);


const StatsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" />
  </svg>
);


const ProjectsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
  </svg>
);


const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);


const LogoutIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);


function Layout({ title, children, headerContent }) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    
    const [userInfo, setUserInfo] = useState({
        name: 'User',
        role: 'User',
        avatar: ''
    });


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


    const navLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors";
    const activeNavLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg font-bold bg-white dark:bg-slate-700 text-black dark:text-white shadow-sm";


    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-white transition-colors duration-200">
            <aside className="w-64 bg-stone-100 dark:bg-slate-800 p-6 flex flex-col justify-between border-r border-gray-200 dark:border-slate-700 transition-colors">
                <div>
                    <div className="text-3xl font-bold mb-12 text-gray-800 dark:text-white">BuildWise</div>
                    <nav className="space-y-4">
                        <NavLink 
                            to="/dashboard" 
                            className={({ isActive }) => isActive ? activeNavLinkClasses : navLinkClasses}
                        >
                            <DashboardIcon />
                            <span>Dashboard</span>
                        </NavLink>
                        
                        <NavLink 
                            to="/statistics" 
                            className={({ isActive }) => isActive ? activeNavLinkClasses : navLinkClasses}
                        >
                            <StatsIcon />
                            <span>Statistics</span>
                        </NavLink>
                        
                        <NavLink 
                            to="/projects" 
                            className={({ isActive }) => isActive ? activeNavLinkClasses : navLinkClasses}
                        >
                            <ProjectsIcon />
                            <span>Projects</span>
                        </NavLink>
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
                {/* Top Header Bar */}
                <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4 transition-colors">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center flex-1">
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{title || 'BuildWise'}</h1>
                            
                            {/* Header Content (like search bar) */}
                            {headerContent && (
                                <div className="flex-1">
                                    {headerContent}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            {/* Theme Toggle Button */}
                            <button 
                                onClick={toggleTheme}
                                className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                aria-label="Toggle theme"
                                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                            >
                                {theme === 'light' ? (
                                    <Moon className="w-5 h-5" />
                                ) : (
                                    <Sun className="w-5 h-5" />
                                )}
                            </button>


                            {/* Settings Button */}
                            <button 
                                onClick={() => navigate('/settings')}
                                className="p-2 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                aria-label="Settings"
                                title="Settings"
                            >
                                <Settings className="w-5 h-5" />
                            </button>


                            {/* User Info */}
                            <div className="flex items-center space-x-4">
                                <div className="text-right">
                                    <div className="font-bold text-gray-800 dark:text-white">{userInfo.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-slate-400">{userInfo.role}</div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                                    {getInitials(userInfo.name)}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>


                {/* Main Content Area */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}


export default Layout;
