import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Shield, Eye, Mail, Phone, Building2, Briefcase, Clock, Activity, X } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import userService from '../services/userService';
import auditService from '../services/auditService';
import { USER_ROLES } from '../utils/constants';
import { useAuditLog } from '../hooks/useAuditLog';
import { useNotification } from '../contexts/NotificationContext';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [detailLogs, setDetailLogs] = useState([]);
  const [detailLogsLoading, setDetailLogsLoading] = useState(false);
  const notify = useNotification();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Project Manager',
  });
  const [formErrors, setFormErrors] = useState({});

  const { logAction, LOG_TYPES } = useAuditLog();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      notify.error('Failed to fetch users. Please check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'Project Manager',
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Project Manager',
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!selectedUser && !formData.password) {
      errors.password = 'Password is required';
    } else if (!selectedUser && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      if (selectedUser) {
        await userService.updateUser(selectedUser.userId, formData);
        
        await logAction(
          LOG_TYPES.USER_UPDATED,
          `Updated user: ${formData.name} (${formData.email})${
            selectedUser.role !== formData.role 
              ? ` - Role changed from "${selectedUser.role}" to "${formData.role}"` 
              : ''
          }`,
          {
            targetResource: 'User',
            targetId: selectedUser.userId,
            oldValue: JSON.stringify({
              name: selectedUser.name,
              email: selectedUser.email,
              role: selectedUser.role
            }),
            newValue: JSON.stringify({
              name: formData.name,
              email: formData.email,
              role: formData.role,
              passwordChanged: formData.password ? true : false
            }),
            status: 'SUCCESS',
          }
        );

        if (formData.password) {
          await logAction(
            LOG_TYPES.PASSWORD_CHANGED,
            `Password changed for user: ${formData.name} (${formData.email})`,
            {
              targetResource: 'User',
              targetId: selectedUser.userId,
              status: 'SUCCESS',
            }
          );
        }

        if (selectedUser.role !== formData.role) {
          await logAction(
            LOG_TYPES.ROLE_CHANGED,
            `Role changed for ${formData.name} from "${selectedUser.role}" to "${formData.role}"`,
            {
              targetResource: 'User',
              targetId: selectedUser.userId,
              oldValue: JSON.stringify({ role: selectedUser.role }),
              newValue: JSON.stringify({ role: formData.role }),
              status: 'SUCCESS',
            }
          );
        }
        
        setUsers(users.map(user => 
          user.userId === selectedUser.userId 
            ? { ...user, ...formData }
            : user
        ));
        notify.success('User updated successfully!');
      } else {
        const newUser = await userService.createUser(formData);
        
        await logAction(
          LOG_TYPES.USER_CREATED,
          `Created new user: ${formData.name} (${formData.email}) with role "${formData.role}"`,
          {
            targetResource: 'User',
            targetId: newUser.userId,
            newValue: JSON.stringify({
              name: formData.name,
              email: formData.email,
              role: formData.role
            }),
            status: 'SUCCESS',
          }
        );
        
        setUsers([...users, newUser]);
        notify.success('User created successfully!');
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.error || 'Error saving user. Please try again.';
      
      if (selectedUser) {
        await logAction(
          LOG_TYPES.USER_UPDATED,
          `Failed to update user: ${formData.name}`,
          {
            targetResource: 'User',
            targetId: selectedUser.userId,
            status: 'FAILED',
            errorMessage: errorMessage,
          }
        );
      } else {
        await logAction(
          LOG_TYPES.USER_CREATED,
          `Failed to create user: ${formData.name}`,
          {
            status: 'FAILED',
            errorMessage: errorMessage,
          }
        );
      }
      
      notify.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsLoading(true);
      await userService.deleteUser(selectedUser.userId);
      
      await logAction(
        LOG_TYPES.USER_DELETED,
        `Deleted user: ${selectedUser.name} (${selectedUser.email})`,
        {
          targetResource: 'User',
          targetId: selectedUser.userId,
          oldValue: JSON.stringify({
            name: selectedUser.name,
            email: selectedUser.email,
            role: selectedUser.role
          }),
          status: 'SUCCESS',
        }
      );
      
      setUsers(users.filter(user => user.userId !== selectedUser.userId));
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      notify.success('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = 'Error deleting user. Please try again.';
      
      await logAction(
        LOG_TYPES.USER_DELETED,
        `Failed to delete user: ${selectedUser.name}`,
        {
          targetResource: 'User',
          targetId: selectedUser.userId,
          status: 'FAILED',
          errorMessage: error.response?.data?.error || errorMessage,
        }
      );
      
      notify.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'Project Manager': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Site Engineer': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Vice President': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const openDetail = async (user) => {
    setDetailUser(user);
    setDetailLogs([]);
    setDetailLogsLoading(true);
    try {
      const data = await auditService.getLogsByUser(user.userId);
      const logs = (data?.logs || data || [])
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
        .slice(0, 15);
      setDetailLogs(logs);
    } catch (err) {
      console.error('Error loading user activity:', err);
    } finally {
      setDetailLogsLoading(false);
    }
  };

  const formatTimeAgo = (ts) => {
    if (!ts) return '—';
    const d = new Date(typeof ts === 'number' ? ts : ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users and their roles</p>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto"
          >
            <Plus className="w-5 h-5 mr-2 inline" />
            Add New User
          </Button>
        </div>

        {isLoading && users.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-semibold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-300">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openDetail(user)}
                        className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mr-3"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        <Edit className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedUser ? 'Edit User' : 'Add New User'}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter full name"
            error={formErrors.name}
            required
          />

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter email address"
            error={formErrors.email}
            required
          />

          <Input
            label={selectedUser ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Enter password"
            error={formErrors.password}
            required={!selectedUser}
          />

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              {Object.values(USER_ROLES).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {formErrors.role && (
              <p className="mt-1 text-sm text-red-500 dark:text-red-400">{formErrors.role}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : selectedUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
        size="sm"
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ───────── User Detail Slide-Over ───────── */}
      {detailUser && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            onClick={() => setDetailUser(null)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">User Details</h2>
              <button
                onClick={() => setDetailUser(null)}
                className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  {detailUser.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{detailUser.name}</h3>
                  <span className={`mt-1 inline-block px-3 py-0.5 text-xs font-semibold rounded-full ${getRoleBadgeColor(detailUser.role)}`}>
                    {detailUser.role}
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Information</h4>

                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <a href={`mailto:${detailUser.email}`} className="text-blue-600 dark:text-blue-400 hover:underline break-all">
                    {detailUser.email}
                  </a>
                </div>

                {detailUser.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{detailUser.phone}</span>
                  </div>
                )}

                {detailUser.company && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{detailUser.company}</span>
                  </div>
                )}

                {detailUser.jobTitle && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{detailUser.jobTitle}</span>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <a
                  href={`mailto:${detailUser.email}?subject=BuildWise Admin - Account Notice`}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </a>
                <button
                  onClick={() => { setDetailUser(null); handleOpenModal(detailUser); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit User
                </button>
              </div>

              {/* Account Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Details</h4>

                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">User ID</p>
                    <p className="text-gray-800 dark:text-gray-200 font-mono text-xs break-all">{detailUser.userId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">2FA Enabled</p>
                    <p className={`font-medium text-xs ${detailUser.twoFactorEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {detailUser.twoFactorEnabled ? '✓ Active' : '✗ Disabled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Registered</p>
                    <p className="text-gray-800 dark:text-gray-200 text-xs">
                      {detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">Last Updated</p>
                    <p className="text-gray-800 dark:text-gray-200 text-xs">
                      {detailUser.updatedAt ? formatTimeAgo(detailUser.updatedAt) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recent Activity</h4>
                </div>

                {detailLogsLoading ? (
                  <div className="space-y-3">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mt-1.5" />
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : detailLogs.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detailLogs.map((log, idx) => (
                      <div key={log.logId || idx} className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-none">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          log.action?.includes('DELETE') ? 'bg-red-500' :
                          log.action?.includes('CREATE') ? 'bg-green-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-800 dark:text-gray-200 truncate">
                            {log.actionDescription || log.description || log.action}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {formatTimeAgo(log.timestamp || log.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">No activity recorded for this user</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserManagement;
