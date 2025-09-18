import React from 'react';
import { Link, NavLink } from 'react-router-dom';

// Simple Icon components for the sidebar
// In a real app, you might use an icon library like 'react-icons'
const DashboardIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
const StatsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg>;
const ProjectsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" /></svg>;
const SettingsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const LogoutIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;

function Layout({ title, children }) {
  // Styles for NavLink to show active page
  const navLinkStyle = ({ isActive }) => {
    return {
      fontWeight: isActive ? 'bold' : 'normal',
      backgroundColor: isActive ? 'white' : '',
      color: 'black'
    };
  };
    
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-100 p-6 flex flex-col justify-between">
        <div>
          <div className="text-3xl font-bold mb-12">demo</div>
          <nav className="space-y-4">
            <NavLink to="/dashboard" style={navLinkStyle} className="flex items-center space-x-3 p-3 rounded-lg">
              <DashboardIcon />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/statistics" style={navLinkStyle} className="flex items-center space-x-3 p-3 rounded-lg">
              <StatsIcon />
              <span>Statistics</span>
            </NavLink>
            <NavLink to="/projects" style={navLinkStyle} className="flex items-center space-x-3 p-3 rounded-lg">
              <ProjectsIcon />
              <span>Projects</span>
            </NavLink>
          </nav>
        </div>
        <div className="space-y-4">
            <Link to="/settings" className="flex items-center space-x-3 p-3 rounded-lg">
              <SettingsIcon />
              <span>Settings</span>
            </Link>
            <Link to="/logout" className="flex items-center space-x-3 p-3 rounded-lg">
              <LogoutIcon />
              <span>Logout</span>
            </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center pb-8">
          <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input type="text" placeholder="Search here" className="bg-stone-100 rounded-full py-2 px-6 focus:outline-none"/>
            </div>
            <div className="text-right">
              <div className="font-bold">John doe</div>
              <div className="text-sm text-gray-500">Super Admin</div>
            </div>
            <img src="https://i.pravatar.cc/48" alt="User Avatar" className="w-12 h-12 rounded-full"/>
          </div>
        </header>
    
        {/* Page-specific content goes here */}
        {children}
      </main>
    </div>
  );
}

export default Layout;