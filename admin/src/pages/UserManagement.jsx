import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Shield } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import userService from '../services/userService';
import { USER_ROLES } from '../utils/constants';
import { useAuditLog } from '../hooks/useAuditLog';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Project Manager',
  });
  const [formErrors, setFormErrors] = useState({});

  // Add audit log hook
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
      alert('Failed to fetch users. Please check console for details.');
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
        // UPDATE USER
        await userService.updateUser(selectedUser.userId, formData);
        
        // Log user update
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

        // If password was changed, log separately
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

        // If role was changed, log separately
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
        alert('User updated successfully!');
      } else {
        // CREATE USER
        const newUser = await userService.createUser(formData);
        
        // Log user creation
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
        alert('User created successfully!');
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.response?.data?.error || 'Error saving user. Please try again.';
      
      // Log failed action
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
      
      alert(errorMessage);
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
      
      // Log user deletion
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
      alert('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = 'Error deleting user. Please try again.';
      
      // Log failed deletion
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
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'Admin': 'bg-purple-100 text-purple-800',
      'Project Manager': 'bg-blue-100 text-blue-800',
      'Site Engineer': 'bg-green-100 text-green-800',
      'Vice President': 'bg-red-100 text-red-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage system users and their roles</p>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <p className="text-gray-600 mt-4">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(user)}
                        className="text-red-600 hover:text-red-900"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {Object.values(USER_ROLES).map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {formErrors.role && (
              <p className="mt-1 text-sm text-red-500">{formErrors.role}</p>
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
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-gray-700 mb-6">
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
    </div>
  );
};

export default UserManagement;