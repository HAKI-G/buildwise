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
import MilestoneStatusPage from './pages/MilestoneStatusPage';
import TaskPriorityPage from './pages/TaskPriorityPage';
import PendingTasksPage from './pages/PendingTasksPage';
import GenerateReportPage from './pages/GenerateReportPage.jsx'; // ✅ Add this import at top
import ReportDetailPage from './pages/ReportDetailPage';

// ✅ NEW: Project Selection Page (like Statistics selection)
import ProjectSelectionPage from './pages/ProjectSelectionPage.jsx';

// ✅ Dedicated View Pages (accessed from sidebar)
import MilestonesViewPage from './pages/MilestonesViewPage.jsx';
import UpdatesViewPage from './pages/UpdatesViewPage.jsx';
import PhotosViewPage from './pages/PhotosViewPage.jsx';
import ReportsViewPage from './pages/ReportsViewPage.jsx';
import CommentsViewPage from './pages/CommentsViewPage.jsx';
import DocumentsViewPage from './pages/DocumentsViewPage.jsx';
import MapsViewPage from './pages/MapsViewPage.jsx';

function App() {
  const location = useLocation();
  
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'Admin';
  
  const { isMaintenanceMode, loading } = useMaintenanceMode();

  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.includes(location.pathname);

  if (loading && !isPublicPath) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  const shouldShowMaintenance = isMaintenanceMode && !isPublicPath && !isAdmin;

  return (
    <ThemeProvider>
      {shouldShowMaintenance ? (
        <MaintenanceScreen />
      ) : (
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/projects/:projectId/view/generate-report" element={<GenerateReportPage />} />
          {/* Dashboard */}
          <Route path="/dashboard" element={<DashboardPage />} />
          
          {/* Projects Routes */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/projects/:projectId/:tab" element={<ProjectDetailPage />} />
          <Route path="/projects/edit/:projectId" element={<UpdateProjectPage />} />
          <Route path="/reports/:reportId" element={<ReportDetailPage />} />
          {/* ✅ NEW: Project Selection Page (like Statistics) */}
          <Route path="/select-project" element={<ProjectSelectionPage />} />
          
          {/* ✅ Dedicated View Routes (no tabs, no full header) */}
          <Route path="/projects/:projectId/view/milestones" element={<MilestonesViewPage />} />
          <Route path="/projects/:projectId/view/updates" element={<UpdatesViewPage />} />
          <Route path="/projects/:projectId/view/photos" element={<PhotosViewPage />} />
          <Route path="/projects/:projectId/view/reports" element={<ReportsViewPage />} />
          <Route path="/projects/:projectId/view/comments" element={<CommentsViewPage />} />
          <Route path="/projects/:projectId/view/documents" element={<DocumentsViewPage />} />
          <Route path="/projects/:projectId/view/maps" element={<MapsViewPage />} />
          
          {/* Statistics Routes */}
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/statistics/:projectId" element={<StatisticsPage />} />
          <Route path="/statistics/:projectId/milestone-status" element={<MilestoneStatusPage />} />
          <Route path="/statistics/:projectId/task-priority" element={<TaskPriorityPage />} />
          <Route path="/statistics/:projectId/pending-tasks" element={<PendingTasksPage />} />
          
          {/* Settings */}
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/setup-2fa" element={<Setup2FAPage />} />
        </Routes>
      )}
    </ThemeProvider>
  );
}

export default App;