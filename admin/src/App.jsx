import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/AdminSettings";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { SettingsProvider } from './contexts/SettingsContext';
import { useMaintenanceMode } from './hooks/useMaintenanceMode';
import { AlertTriangle } from 'lucide-react';
import SupportTickets from './pages/SupportTickets';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Announcements from './pages/Announcements';
import ExportCenter from './pages/ExportCenter';
import AdminProfile from './pages/AdminProfile';

// Maintenance Banner Component
const MaintenanceBanner = () => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-3 z-[9999] shadow-lg">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <AlertTriangle className="w-5 h-5 animate-pulse" />
        <span className="font-semibold">
          ⚠️ Maintenance Mode Active
        </span>
        <span className="hidden sm:inline text-sm opacity-90">
          - Users cannot access the application
        </span>
      </div>
    </div>
  );
};

// Protected Content with Settings (only loads after authentication)
const ProtectedContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const { isMaintenanceMode, loading } = useMaintenanceMode();

  return (
    <>
      {!loading && isMaintenanceMode && !isLoginPage && <MaintenanceBanner />}
      <div className={isMaintenanceMode && !loading && !isLoginPage ? "pt-12" : ""}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/support-tickets" element={<SupportTickets />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/profile" element={<AdminProfile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </>
  );
};

// Main App Content - MUST be inside Router to use useLocation
const AppContent = () => {
  return (
    <Routes>
      {/* Public Route - Login page WITHOUT SettingsProvider */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes - WITH SettingsProvider */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <SettingsProvider>
              <Layout>
                <ProtectedContent />
              </Layout>
            </SettingsProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
      <Router>
        <AppContent />
      </Router>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
