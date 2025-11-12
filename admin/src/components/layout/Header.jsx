import { Menu, Bell, LogOut, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth } from '../../utils/auth';
import NotificationDropdown from '../common/NotificationDropdown';
import { useSettings } from '../../contexts/SettingsContext';
import notificationService from '../../services/notificationService';

const Header = ({ toggleSidebar, sidebarOpen }) => {
  const navigate = useNavigate();
  const user = auth.getUser();
  const { settings } = useSettings();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ TRACK SCREEN SIZE
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ DARK MODE STATE
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // ✅ APPLY DARK MODE
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationService.getNotifications(false);
      setNotifications(response.notifications || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter notifications based on settings
  const activeNotifications = notifications.filter(notification => {
    if (!settings.notifications.emailNotifications) return false;

    switch (notification.type) {
      case 'PROJECT_CREATED':
        return settings.notifications.projectCreated;
      case 'PROJECT_UPDATED':
        return settings.notifications.projectUpdated;
      case 'PROJECT_DELETED':
        return settings.notifications.projectDeleted;
      case 'USER_CREATED':
        return settings.notifications.userCreated;
      case 'USER_ROLE_CHANGED':
        return settings.notifications.userRoleChanged;
      case 'SYSTEM_ALERT':
        return settings.notifications.systemAlerts;
      default:
        return true;
    }
  });

  const activeUnreadCount = activeNotifications.filter(n => !n.read).length;

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (notification) => {
    try {
      await notificationService.markAsRead(notification.notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ✅ FIXED: Determine if hamburger should be visible
  const showHamburger = !isDesktop || (isDesktop && !sidebarOpen);

  return (
    <header className="bg-white dark:bg-gradient-to-r dark:from-gray-900/95 dark:to-gray-800/95 bg-gradient-to-r from-gray-50 to-gray-100 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700/50 h-16 flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg dark:shadow-xl transition-colors">
      {/* Left Section - Hamburger Menu (Only when needed) */}
      <div className="flex items-center">
        {/* ✅ FIXED: Only show hamburger on mobile OR when sidebar is closed on desktop */}
        {showHamburger && (
          <button
            onClick={toggleSidebar}
            className="group relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg"
            title="Open Menu"
          >
            <Menu className="w-6 h-6 transition-transform group-hover:scale-110" />
          </button>
        )}
      </div>

      {/* Right Section - User Actions */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="group relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Moon className="w-5 h-5 text-blue-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-180" />
          )}
          <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-xl z-50">
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-800 dark:border-b-gray-700"></div>
          </span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="group relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg"
          >
            <Bell className="w-5 h-5 transition-transform group-hover:scale-110 group-hover:rotate-12" />
            {activeUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold px-1.5 animate-pulse shadow-lg shadow-red-500/50">
                {activeUnreadCount > 99 ? '99+' : activeUnreadCount}
              </span>
            )}
          </button>

          <NotificationDropdown
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={activeNotifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            loading={loading}
          />
        </div>

        {/* User Profile Section */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-300 dark:border-gray-700/50">
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <div className="relative w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-gray-200 dark:ring-gray-800 group-hover:ring-blue-500/50 transition-all">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>

          <div className="hidden md:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {user?.name || 'Admin'}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              {user?.role || 'Administrator'}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="group relative p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg ml-2"
            title="Logout"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:scale-110 group-hover:translate-x-0.5" />
            <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Logout
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;