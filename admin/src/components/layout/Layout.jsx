import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  // ✅ FIXED: Detect screen size and set initial sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Desktop: open by default, Mobile: closed by default
    return window.innerWidth >= 1024;
  });

  // ✅ FIXED: Handle window resize to auto-adjust sidebar
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      setSidebarOpen(isDesktop);
    };

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    console.log('Toggle clicked! Current state:', sidebarOpen);
    setSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    console.log('Close clicked!');
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header toggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;