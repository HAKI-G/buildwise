import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Page Imports
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import StatisticsPage from './pages/StatisticsPage';
import ProjectsPage from './pages/ProjectsPage';
// Add any other page imports you need, like ProjectDetailPage or EditProjectPage

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

      {/* --- THIS IS THE CHANGE --- */}
      {/* The route now accepts a dynamic projectId */}
      <Route path="/statistics/:projectId" element={<StatisticsPage />} /> 

      {/* Add your other dynamic routes here if you bring them back */}
      {/* <Route path="/project/:projectId" element={<ProjectDetailPage />} /> */}
      {/* <Route path="/project/edit/:projectId" element={<EditProjectPage />} /> */}
    </Routes>
  );
}

export default App;