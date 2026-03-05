import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import logo from '../images/logo.png';
import { useTheme } from '../context/ThemeContext';
import SettingsModal from './SettingsModal';

const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
  </svg>
);
const StatsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
  </svg>
);
const ProjectsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
  </svg>
);

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isStatsActive = location.pathname.startsWith('/statistics');

  const base   = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white hover:shadow-sm transition-all";
  const active = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-stone-100 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col p-5">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-1">
          <img src={logo} alt="BuildWise" className="h-10 w-auto object-contain"/>
          <span className="text-xl font-bold text-gray-900 dark:text-white">BuildWise</span>
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink to="/dashboard" className={({isActive})=>isActive?active:base}>
            <DashboardIcon/><span>Dashboard</span>
          </NavLink>
          <button onClick={()=>navigate('/statistics')} className={isStatsActive?active:base}>
            <StatsIcon/><span>Statistics</span>
          </button>
          <NavLink to="/projects" className={({isActive})=>isActive?active:base}>
            <ProjectsIcon/><span>Projects</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main — fills remaining height, no overflow on outer, children scroll inside */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>

    </div>
  );
}

export default Layout;