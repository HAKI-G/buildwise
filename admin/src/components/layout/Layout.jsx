import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f9fafb', padding: '1.5rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;