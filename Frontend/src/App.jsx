import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Page Imports - Added .jsx extension to fix path resolution
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StatisticsPage from './pages/StatisticsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import UpdateProjectPage from './pages/UpdateProjectPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx'; 

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/statistics/:projectId" element={<StatisticsPage />} /> 
      <Route path="/project/:projectId" element={<ProjectDetailPage />} />
      {/* This new route fixes the "Update Project" error */}
      <Route path="/project/edit/:projectId" element={<UpdateProjectPage />} />
      <Route path="/settings" element={<SettingsPage />} />

    </Routes>
  );
}

export default App;

