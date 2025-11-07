import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { useMaintenanceMode } from './hooks/useMaintenanceMode';
import MaintenanceScreen from './components/MaintenanceScreen';

// Page Imports
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StatisticsPage from './pages/StatisticsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import UpdateProjectPage from './pages/UpdateProjectPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import Setup2FAPage from './pages/Setup2FAPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

function App() {
  const location = useLocation();
  
  // ✅ Get user role from localStorage
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'Admin';
  
  const { isMaintenanceMode, loading } = useMaintenanceMode();

  // ✅ Always allow login and register pages
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.includes(location.pathname);

  // Show loading while checking maintenance status
  if (loading && !isPublicPath) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  // ✅ Show maintenance screen if:
  // - Maintenance mode is ON
  // - User is NOT on a public path (login/register)
  // - User is NOT an admin
  const shouldShowMaintenance = isMaintenanceMode && !isPublicPath && !isAdmin;

  return (
    <ThemeProvider>
      {shouldShowMaintenance ? (
        <MaintenanceScreen />
      ) : (
        <Routes>
          {/* Public Routes - Always accessible */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          
          
          {/* Statistics Routes */}
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/statistics/:projectId" element={<StatisticsPage />} />
          
          <Route path="/project/:projectId" element={<ProjectDetailPage />} />
          <Route path="/project/edit/:projectId" element={<UpdateProjectPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/setup-2fa" element={<Setup2FAPage />} />
        </Routes>
      )}
    </ThemeProvider>
  );
}

export default App;