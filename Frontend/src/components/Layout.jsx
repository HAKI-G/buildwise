import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

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

function Layout({ title, children }) {
    const navigate = useNavigate();
    
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

    const handleStatisticsClick = () => {
        const lastSelectedProjectId = localStorage.getItem('lastSelectedProjectId');
        if (lastSelectedProjectId) {
            navigate(`/statistics/${lastSelectedProjectId}`);
        } else {
            alert("Please select a project from the Dashboard or Projects page first.");
            navigate('/projects');
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

    const getAvatarUrl = () => {
        if (userInfo.avatar && userInfo.avatar.trim() !== '') {
            return userInfo.avatar;
        }
        const name = userInfo.name || 'User';
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&size=128&bold=true`;
    };

    const navLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors";
    const activeNavLinkClasses = "w-full text-left flex items-center space-x-3 p-3 rounded-lg font-bold bg-white text-black shadow-sm";

    return (
        <div className="flex h-screen bg-gray-50 text-gray-800">
            <aside className="w-64 bg-stone-100 p-6 flex flex-col justify-between">
                <div>
                    <div className="text-3xl font-bold mb-12 text-gray-800">demo</div>
                    <nav className="space-y-4">
                        <NavLink 
                            to="/dashboard" 
                            className={({ isActive }) => isActive ? activeNavLinkClasses : navLinkClasses}
                        >
                            <DashboardIcon />
                            <span>Dashboard</span>
                        </NavLink>
                        
                        <button 
                            onClick={handleStatisticsClick} 
                            className={navLinkClasses}
                        >
                            <StatsIcon />
                            <span>Statistics</span>
                        </button>
                        
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

            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center pb-8">
                    <h1 className="text-3xl font-bold text-gray-800">{title || 'BuildWise'}</h1>
                    
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <div className="font-bold text-gray-800">{userInfo.name}</div>
                            <div className="text-sm text-gray-500">{userInfo.role}</div>
                        </div>
                        <img 
                            src={getAvatarUrl()} 
                            alt={`${userInfo.name} Avatar`} 
                            className="w-12 h-12 rounded-full border-2 border-gray-200 object-cover shadow-sm"
                            onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.name)}&background=3b82f6&color=fff&size=128&bold=true`;
                            }}
                        />
                    </div>
                </header>
                
                {children}
            </main>
        </div>
    );
}

export default Layout;