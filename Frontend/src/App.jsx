import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Your existing page imports
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';

// --- 1. IMPORT YOUR NEW PAGES ---
import StatisticsPage from './pages/StatisticsPage';
import ProjectsPage from './pages/ProjectsPage';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<DashboardPage />} />
      
      {/* --- 2. ADD THE NEW ROUTES FOR YOUR PAGES --- */}
      <Route path="/statistics" element={<StatisticsPage />} />
      <Route path="/projects" element={<ProjectsPage />} />

    </Routes>
  );
}

export default App;