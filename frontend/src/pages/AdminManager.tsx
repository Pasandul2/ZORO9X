import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Shield, Lock, Unlock } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

interface Admin {
  id: number;
  email: string;
  fullName: string;
  role: 'super_admin' | 'admin';
  permissions: any; // Can be object or string
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

interface AdminManagerProps {
  darkMode: boolean;
}

const AdminManager: React.FC<AdminManagerProps> = ({ darkMode }) => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'admin' as 'super_admin' | 'admin',
    permissions: {
      dashboard: true,
      users: false,
      portfolio: true,
      saas: false,
      analytics: false,
      database: false,
      reports: false,
      settings: false,
      adminManagement: false
    }
  });

  const permissionLabels = {
    dashboard: 'Dashboard Access',
    users: 'User Management',
    portfolio: 'Portfolio Management',
    saas: 'SaaS Analytics',
    analytics: 'Analytics',
    database: 'Database Management',
    reports: 'Reports & Exports',
    settings: 'Settings',
    adminManagement: 'Admin Management'
  };

  // Helper function to safely parse permissions
  const parsePermissions = (permissions: any) => {
    if (!permissions) {
      return {
        dashboard: true,
        users: false,
        portfolio: true,
        saas: false,
        analytics: false,
        database: false,
        reports: false,
        settings: false,
        adminManagement: false
      };
    }
    
    if (typeof permissions === 'string') {
      try {
        return JSON.parse(permissions);
      } catch (e) {
        console.error('Failed to parse permissions:', e);
        return {
          dashboard: true,
          users: false,
          portfolio: true,
          saas: false,
          analytics: false,
          database: false,
          reports: false,
          settings: false,
          adminManagement: false
        };
      }
    }
    
    return permissions;
  };

  // Fetch all admins
  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError('No admin token found. Please login again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.admins && Array.isArray(data.admins)) {
        // Parse permissions if they're strings
        const parsedAdmins = data.admins.map((admin: any) => {
          const parsedPermissions = parsePermissions(admin.permissions);
          return {
            id: admin.id,
            email: admin.email,
            fullName: admin.fullName,
            role: admin.role,
            permissions: parsedPermissions,
            status: admin.status || 'active',
            created_at: admin.created_at
          };
        });
        setAdmins(parsedAdmins);
      } else {
        setAdmins([]);
      }
    } catch (err) {
      console.error('Fetch admins error:', err);
      setError('Failed to fetch admins: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      email: '',
      password: '',
      fullName: '',
      role: 'admin',
      permissions: {
        dashboard: true,
        users: false,
        portfolio: true,
        saas: false,
        analytics: false,
        database: false,
        reports: false,
        settings: false,
        adminManagement: false
      }
    });
    setShowModal(true);
  };

  const handleEdit = (admin: Admin) => {
    setEditingId(admin.id);
    
    setFormData({
      email: admin.email,
      password: '',
      fullName: admin.fullName,
      role: admin.role,
      permissions: parsePermissions(admin.permissions)
    });
    setShowModal(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value as 'super_admin' | 'admin';
    
    // Update permissions based on role
    const newPermissions = { ...formData.permissions };
    if (role === 'super_admin') {
      Object.keys(newPermissions).forEach(key => {
        (newPermissions as any)[key] = true;
      });
    } else {
      newPermissions.users = false;
      newPermissions.saas = false;
      newPermissions.analytics = false;
      newPermissions.database = false;
      newPermissions.reports = false;
      newPermissions.settings = false;
      newPermissions.adminManagement = false;
    }

    setFormData({
      ...formData,
      role,
      permissions: newPermissions
    });
  };

  const togglePermission = (permission: keyof typeof formData.permissions) => {
    if (formData.role === 'super_admin') return; // Can't modify super_admin permissions
    
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permission]: !formData.permissions[permission]
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');

    if (!token) {
      setError('Unauthorized. Please login again.');
      return;
    }

    if (!formData.email || !formData.fullName) {
      setError('Email and Full Name are required');
      return;
    }

    if (!editingId && !formData.password) {
      setError('Password is required for new admin');
      return;
    }

    try {
      const url = editingId
        ? `${import.meta.env.VITE_API_URL}/api/admin/admins/${editingId}`
        : `${import.meta.env.VITE_API_URL}/api/admin/admins`;

      const payload = editingId
        ? {
            fullName: formData.fullName,
            role: formData.role,
            permissions: formData.permissions,
            status: 'active'
          }
        : {
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            role: formData.role,
            permissions: formData.permissions
          };

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingId ? 'Admin updated successfully!' : 'Admin created successfully!');
        setShowModal(false);
        fetchAdmins();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      setError('Failed to save admin');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
      setError('Unauthorized. Please login again.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/admins/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Admin deleted successfully!');
        setDeleteId(null);
        fetchAdmins();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Delete failed');
      }
    } catch (err) {
      setError('Failed to delete admin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Admin Management
        </h2>
        <motion.button
          onClick={handleAdd}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Admin
        </motion.button>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admins Table */}
      <div className={`rounded-xl overflow-hidden border ${
        darkMode ? 'bg-gray-800/50 border-purple-500/20' : 'bg-white border-gray-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${darkMode ? 'bg-gray-900/50 border-purple-500/20' : 'bg-gray-50 border-gray-200'}`}>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Name</th>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Email</th>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Role</th>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Status</th>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Permissions</th>
                <th className={`px-6 py-4 text-left text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className={`border-b ${darkMode ? 'border-purple-500/10 hover:bg-gray-700/20' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <td className={`px-6 py-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center gap-2">
                      {admin.role === 'super_admin' && <Shield className="w-4 h-4 text-yellow-500" />}
                      {admin.fullName}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{admin.email}</td>
                  <td className={`px-6 py-4 text-sm`}>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      admin.role === 'super_admin'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm`}>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      admin.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : admin.status === 'suspended'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {admin.status}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm`}>
                    <div className="flex gap-1">
                      {admin.permissions && typeof admin.permissions === 'object' && Object.entries(admin.permissions).slice(0, 3).map(([key, value]) => (
                        <span key={key} title={permissionLabels[key as keyof typeof permissionLabels]}>
                          {value ? <Unlock className="w-4 h-4 text-green-400" /> : <Lock className="w-4 h-4 text-gray-500" />}
                        </span>
                      ))}
                      {admin.permissions && typeof admin.permissions === 'object' && Object.values(admin.permissions).filter(v => v).length > 3 && (
                        <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>+{Object.values(admin.permissions).filter(v => v).length - 3}</span>
                      )}
                      {(!admin.permissions || typeof admin.permissions !== 'object') && (
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No permissions</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-sm`}>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => handleEdit(admin)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>
                      {admin.role !== 'super_admin' && (
                        <motion.button
                          onClick={() => setDeleteId(admin.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {admins.length === 0 && (
        <div className="text-center py-20">
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No admins found
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 p-4 overflow-y-auto flex items-center justify-center" style={{ top: 0 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-full max-w-2xl rounded-xl p-8 my-auto ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingId ? 'Edit Admin' : 'Add New Admin'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email {!editingId && '*'}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required={!editingId}
                      disabled={!!editingId}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>

                {!editingId && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingId}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        darkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleRoleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                {/* Permissions */}
                <div>
                  <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Permissions {formData.role === 'super_admin' && <span className="text-xs text-gray-500">(Super Admin - Full Access)</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(formData.permissions).map(([key, value]) => (
                      <motion.button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(key as keyof typeof formData.permissions)}
                        disabled={formData.role === 'super_admin'}
                        whileHover={formData.role !== 'super_admin' ? { scale: 1.02 } : {}}
                        whileTap={formData.role !== 'super_admin' ? { scale: 0.98 } : {}}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          value
                            ? `${darkMode ? 'bg-purple-600/30 border-purple-500' : 'bg-purple-100 border-purple-500'} ${darkMode ? 'text-purple-300' : 'text-purple-700'}`
                            : `${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-300'} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`
                        } ${formData.role === 'super_admin' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center gap-2">
                          {value ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          <span>{permissionLabels[key as keyof typeof permissionLabels]}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-medium"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 py-3 rounded-lg font-medium ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Admin"
        message="Are you sure you want to delete this admin? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default AdminManager;
