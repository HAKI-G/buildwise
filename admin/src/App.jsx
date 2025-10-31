import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/AdminSettings";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { SettingsProvider } from './components/contexts/SettingsContext';


function App() {
  return (
    <SettingsProvider>  {/* ✅ ADD THIS LINE */}
      <Router>
        {/* Global Toast Container */}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "",
            style: {
              background: "#1f2937",
              color: "#fff",
              borderRadius: "0.5rem",
            },
          }}
        />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </SettingsProvider> 
  );
}

export default App;