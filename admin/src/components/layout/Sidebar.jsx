import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import { useEffect, useMemo } from 'react';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const { settings, loading, error } = useSettings();

  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/',
      gradient: 'from-blue-500 to-cyan-500',
      glow: 'blue'
    },
    { 
      name: 'User Management', 
      icon: Users, 
      path: '/users',
      gradient: 'from-purple-500 to-pink-500',
      glow: 'purple'
    },
    { 
      name: 'Audit Logs', 
      icon: FileText, 
      path: '/audit-logs',
      gradient: 'from-green-500 to-emerald-500',
      glow: 'green'
    },
    { 
      name: 'Support Tickets', 
      icon: Mail, 
      path: '/support-tickets',
      gradient: 'from-orange-500 to-red-500',
      glow: 'orange'
    },
    { 
      name: 'Settings', 
      icon: Settings, 
      path: '/settings',
      gradient: 'from-gray-500 to-slate-500',
      glow: 'gray'
    },
  ];

  // Safe app name extraction with fallbacks
  const appName = useMemo(() => {
    if (loading) return 'BuildWise';
    if (error) return 'BuildWise';
    return settings?.general?.appName || 'BuildWise';
  }, [settings, loading, error]);

  // Safe initials extraction
  const appInitials = useMemo(() => {
    try {
      return appName
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'BW';
    } catch (err) {
      console.error('Error generating app initials:', err);
      return 'BW';
    }
  }, [appName]);

  // Inject and cleanup custom CSS animations
  useEffect(() => {
    const styleId = 'sidebar-animations';
    
    // Only add if not already present
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
          }
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .gradient-border {
          position: relative;
        }

        .gradient-border::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 4px;
          height: 100%;
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .gradient-border.active::before {
          opacity: 1;
        }

        /* Smooth text transitions */
        .sidebar-text {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }

        .sidebar-text-enter {
          opacity: 0;
          transform: translateX(-10px);
        }

        .sidebar-text-visible {
          opacity: 1;
          transform: translateX(0);
        }
      `;
      document.head.appendChild(style);
    }

    // Cleanup function
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  const getGlowClass = (color, isActive) => {
    if (!isActive) return '';
    const glowColors = {
      blue: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      purple: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
      green: 'shadow-[0_0_20px_rgba(34,197,94,0.5)]',
      orange: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
      gray: 'shadow-[0_0_20px_rgba(107,114,128,0.5)]'
    };
    return glowColors[color] || '';
  };

  return (
    <div
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 text-white transition-all duration-300 ease-in-out relative flex flex-col border-r border-gray-800/50 shadow-2xl`}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-transparent opacity-50 pointer-events-none"></div>

      {/* Header with logo */}
      <div className="relative flex items-center justify-between h-16 px-4 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/30 backdrop-blur-sm">
        {isOpen ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg animate-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="transition-all duration-300 ease-in-out" style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateX(0)' : 'translateX(-10px)'
            }}>
              <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                {appName}
              </h1>
              <p className="text-xs text-gray-500 whitespace-nowrap">Admin Panel</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto relative group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
              <span className="text-sm font-bold">{appInitials}</span>
            </div>
            {/* Tooltip on hover */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
              {appName}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
            </div>
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-20 bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 rounded-full p-1.5 hover:from-blue-600 hover:to-purple-600 hover:border-blue-500 transition-all duration-300 hover:scale-110 shadow-lg z-10 group"
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:scale-110" />
        ) : (
          <ChevronRight className="w-4 h-4 transition-transform group-hover:scale-110" />
        )}
      </button>

      {/* Navigation */}
      <nav className="mt-6 flex-1 px-3 space-y-2" role="navigation" aria-label="Main navigation">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group relative flex items-center px-3 py-3 rounded-xl transition-all duration-300 gradient-border ${
                isActive ? 'active' : ''
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Background gradient on active/hover */}
              <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                isActive 
                  ? `bg-gradient-to-r ${item.gradient} opacity-20 ${getGlowClass(item.glow, true)}`
                  : 'bg-gray-800/0 group-hover:bg-gray-800/50'
              }`}></div>

              {/* Icon container */}
              <div className={`relative z-10 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                isActive 
                  ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                  : 'bg-gray-800/50 group-hover:bg-gray-700/50'
              }`}>
                <Icon className={`w-5 h-5 transition-all duration-300 ${
                  isActive 
                    ? 'text-white scale-110' 
                    : 'text-gray-400 group-hover:text-white group-hover:scale-110'
                }`} />
              </div>

              {/* Text label with smooth transition */}
              <span 
                className={`relative z-10 ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isActive 
                    ? 'text-white' 
                    : 'text-gray-400 group-hover:text-white'
                }`}
                style={{
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? 'translateX(0)' : 'translateX(-10px)',
                  width: isOpen ? 'auto' : '0',
                  overflow: 'hidden'
                }}
              >
                {item.name}
              </span>

              {/* Active indicator pulse */}
              {isActive && isOpen && (
                <div className="absolute right-3 w-2 h-2 rounded-full bg-white animate-pulse"></div>
              )}

              {/* Hover tooltip when collapsed */}
              {!isOpen && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Status Indicator */}
      <div className="relative px-4 py-4 border-t border-gray-800/50 bg-gradient-to-r from-gray-900/50 to-gray-800/30 backdrop-blur-sm">
        {isOpen ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)] flex-shrink-0"></div>
            <div className="flex-1 min-w-0 transition-all duration-300 ease-in-out" style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateX(0)' : 'translateX(-10px)'
            }}>
              <p className="text-xs font-medium text-gray-300 whitespace-nowrap">System Status</p>
              <p className="text-xs text-green-400 whitespace-nowrap">All systems operational</p>
            </div>
            <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;