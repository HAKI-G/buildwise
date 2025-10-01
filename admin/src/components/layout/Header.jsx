import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../utils/auth';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const user = auth.getUser();

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
      <button
        onClick={toggleSidebar}
        className="text-gray-600 hover:text-gray-900"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div className="flex items-center space-x-4">
        <button className="relative text-gray-600 hover:text-gray-900">
          <Bell className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            3
          </span>
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-700">{user?.name || 'Admin'}</p>
            <p className="text-xs text-gray-500">{user?.role || 'Administrator'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="text-gray-600 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default Header;