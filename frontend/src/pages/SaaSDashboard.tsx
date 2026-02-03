import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Server, Users, DollarSign, TrendingUp, Package, 
  Plus, Edit, Trash2, X, Shield, AlertTriangle, CheckCircle, 
  XCircle, Clock, Monitor, AlertCircle 
} from 'lucide-react';

interface SaasDashboardProps {
  darkMode: boolean;
}

interface DashboardStats {
  totalSystems: number;
  totalClients: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  recentSubscriptions: any[];
}

interface System {
  id: number;
  name: string;
  description: string;
  category: string;
  status: string;
  features: string[];
  python_file_path?: string;
  icon_url?: string;
  version?: string;
}

const SaaSDashboard: React.FC<SaasDashboardProps> = ({ darkMode }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systems, setSystems] = useState<System[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'systems' | 'clients' | 'security'>('overview');
  const [showAddSystem, setShowAddSystem] = useState(false);
  const [showEditSystem, setShowEditSystem] = useState(false);
  const [showManagePlans, setShowManagePlans] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  
  // Security states
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pendingDevices, setPendingDevices] = useState<any[]>([]);
  const [securityTab, setSecurityTab] = useState<'devices' | 'alerts'>('devices');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityData();
    }
  }, [activeTab, filterStatus]);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      // Fetch dashboard stats
      const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch systems
      const systemsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems`);
      if (systemsResponse.ok) {
        const systemsData = await systemsResponse.json();
        // Ensure features is always an array
        const systemsWithParsedFeatures = systemsData.systems.map((system: any) => ({
          ...system,
          features: Array.isArray(system.features) 
            ? system.features 
            : typeof system.features === 'string' 
            ? JSON.parse(system.features || '[]')
            : []
        }));
        setSystems(systemsWithParsedFeatures);
      }

      // Fetch clients
      const clientsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData.clients);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchSecurityData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Fetch security alerts
      const alertsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/security/alerts?status=${filterStatus}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const alertsData = await alertsRes.json();
      
      // Fetch pending devices
      const devicesRes = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/security/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const devicesData = await devicesRes.json();
      
      setAlerts(alertsData.alerts || []);
      setPendingDevices(devicesData.devices || []);
    } catch (error) {
      console.error('Error fetching security data:', error);
    }
  };

  const approveDevice = async (deviceId: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/security/devices/${deviceId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        alert('Device approved successfully!');
        fetchSecurityData();
      }
    } catch (error) {
      console.error('Error approving device:', error);
      alert('Failed to approve device');
    }
  };

  const rejectDevice = async (deviceId: number, reason: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/security/devices/${deviceId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      if (res.ok) {
        alert('Device rejected successfully!');
        fetchSecurityData();
      }
    } catch (error) {
      console.error('Error rejecting device:', error);
      alert('Failed to reject device');
    }
  };

  const resolveAlert = async (alertId: number, action: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/security/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action_taken: action, resolution_notes: `Resolved by admin` })
      });
      
      if (res.ok) {
        alert('Alert resolved!');
        fetchSecurityData();
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'concurrent_use': return <AlertTriangle className="w-5 h-5" />;
      case 'device_limit_exceeded': return <Monitor className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode 
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Ensure monthlyRevenue is a safe number before rendering
  const revenueVal = (() => {
    const r: any = stats?.monthlyRevenue;
    if (typeof r === 'number') return r;
    const parsed = Number(r);
    return Number.isFinite(parsed) ? parsed : 0;
  })();

  return (
    <div className={`min-h-screen pt-32 pb-20 px-4 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Server className="w-10 h-10 text-purple-500" />
              SaaS Systems Dashboard
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your SaaS systems, clients, and subscriptions
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/admin/generate-system')}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            🚀 Generate New System
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          {['overview', 'systems', 'clients', 'security'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 rounded-lg font-semibold capitalize transition-colors flex items-center gap-2 ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : darkMode
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'security' && <Shield className="w-4 h-4" />}
              {tab}
              {tab === 'security' && pendingDevices.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingDevices.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Add System Modal */}
        {showAddSystem && (
          <AddSystemModal
            darkMode={darkMode}
            onClose={() => setShowAddSystem(false)}
            onSuccess={() => {
              setShowAddSystem(false);
              fetchDashboardData();
            }}
          />
        )}

        {/* Edit System Modal */}
        {showEditSystem && selectedSystem && (
          <EditSystemModal
            darkMode={darkMode}
            system={selectedSystem}
            onClose={() => {
              setShowEditSystem(false);
              setSelectedSystem(null);
            }}
            onSuccess={() => {
              setShowEditSystem(false);
              setSelectedSystem(null);
              fetchDashboardData();
            }}
          />
        )}

        {/* Manage Plans Modal */}
        {showManagePlans && selectedSystem && (
          <ManagePlansModal
            darkMode={darkMode}
            system={selectedSystem}
            onClose={() => {
              setShowManagePlans(false);
              setSelectedSystem(null);
            }}
          />
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Systems"
                value={stats?.totalSystems || 0}
                icon={<Package />}
                color="blue"
                darkMode={darkMode}
              />
              <StatCard
                title="Total Clients"
                value={stats?.totalClients || 0}
                icon={<Users />}
                color="purple"
                darkMode={darkMode}
              />
              <StatCard
                title="Active Subscriptions"
                value={stats?.activeSubscriptions || 0}
                icon={<TrendingUp />}
                color="green"
                darkMode={darkMode}
              />
              <StatCard
                title="Monthly Revenue"
                value={`$${revenueVal.toFixed(2)}`}
                icon={<DollarSign />}
                color="yellow"
                darkMode={darkMode}
              />
            </div>

            {/* Recent Subscriptions */}
            <div className={`rounded-2xl p-6 border ${
              darkMode 
                ? 'bg-gray-800/50 border-purple-500/20' 
                : 'bg-white/80 border-purple-200'
            }`}>
              <h2 className="text-2xl font-bold mb-4">Recent Subscriptions</h2>
              <div className="space-y-3">
                {stats?.recentSubscriptions.map((sub: any) => (
                  <div
                    key={sub.id}
                    className={`p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{sub.company_name}</p>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {sub.system_name} - {sub.plan_name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        sub.status === 'active' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Systems Tab */}
        {activeTab === 'systems' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              {systems.map((system) => (
                <SystemCard
                  key={system.id}
                  system={system}
                  darkMode={darkMode}
                  onEdit={() => {
                    setSelectedSystem(system);
                    setShowEditSystem(true);
                  }}
                  onManagePlans={() => {
                    setSelectedSystem(system);
                    setShowManagePlans(true);
                  }}
                  onDelete={async (id: number) => {
                    if (confirm('Are you sure you want to delete this system?')) {
                      try {
                        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/systems/${id}`, {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                          }
                        });
                        if (response.ok) {
                          setSystems(systems.filter(s => s.id !== id));
                        }
                      } catch (error) {
                        console.error('Failed to delete system:', error);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={`rounded-2xl p-6 border ${
              darkMode 
                ? 'bg-gray-800/50 border-purple-500/20' 
                : 'bg-white/80 border-purple-200'
            }`}>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className={`p-4 rounded-lg ${
                      darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{client.company_name}</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {client.contact_email}
                        </p>
                        <div className="flex gap-4 mt-2">
                          <span className="text-sm">
                            Total: <strong>{client.total_subscriptions}</strong>
                          </span>
                          <span className="text-sm text-green-400">
                            Active: <strong>{client.active_subscriptions}</strong>
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        client.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Security Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Pending Devices</p>
                    <p className="text-3xl font-bold text-white mt-2">{pendingDevices.length}</p>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-500" />
                </div>
              </div>
              
              <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Critical Alerts</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">
                      {alerts.filter((a: any) => a.severity === 'critical' && a.status === 'pending').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </div>
              
              <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Concurrent Use</p>
                    <p className="text-3xl font-bold text-orange-500 mt-2">
                      {alerts.filter((a: any) => a.alert_type === 'concurrent_use' && a.status === 'pending').length}
                    </p>
                  </div>
                  <Monitor className="w-10 h-10 text-orange-500" />
                </div>
              </div>
              
              <div className={`rounded-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Resolved Today</p>
                    <p className="text-3xl font-bold text-green-500 mt-2">
                      {alerts.filter((a: any) => a.status === 'resolved').length}
                    </p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
              </div>
            </div>

            {/* Security Sub-tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSecurityTab('devices')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  securityTab === 'devices'
                    ? 'bg-cyan-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Pending Devices ({pendingDevices.length})
              </button>
              <button
                onClick={() => setSecurityTab('alerts')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  securityTab === 'alerts'
                    ? 'bg-cyan-500 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Security Alerts ({alerts.filter((a: any) => a.status === 'pending').length})
              </button>
            </div>

            {/* Pending Devices Table */}
            {securityTab === 'devices' && (
              <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}>
                <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pending Device Activations</h2>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Review and approve device activation requests</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Company</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>System</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Device</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>IP Address</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Devices</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Requested</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {pendingDevices.map((device: any) => {
                        const deviceInfo = typeof device.device_info === 'string' 
                          ? JSON.parse(device.device_info) 
                          : device.device_info;
                        
                        return (
                          <tr key={device.id} className={darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-4">
                              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{device.company_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{device.system_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{device.device_name}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{deviceInfo?.os} {deviceInfo?.os_version}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{device.ip_address}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {device.active_count} / {device.max_activations}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(device.first_activated).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approveDevice(device.id)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg flex items-center gap-1"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Enter rejection reason:');
                                    if (reason) rejectDevice(device.id, reason);
                                  }}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg flex items-center gap-1"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {pendingDevices.length === 0 && (
                    <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No pending device activations
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Alerts Table */}
            {securityTab === 'alerts' && (
              <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} overflow-hidden`}>
                <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                  <div>
                    <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Security Alerts</h2>
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Monitor and respond to security threats</p>
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                    <option value="">All</option>
                  </select>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Severity</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Type</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Company</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Details</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Time</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {alerts.map((alert: any) => {
                        const details = typeof alert.details === 'string' 
                          ? JSON.parse(alert.details) 
                          : alert.details;
                        
                        return (
                          <tr key={alert.id} className={darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(alert.severity)}`}>
                                {alert.severity.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {getAlertIcon(alert.alert_type)}
                                <span className="text-sm">{alert.alert_type.replace(/_/g, ' ')}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{alert.company_name}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{alert.system_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{details?.message}</div>
                              {details?.current_ip && (
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>IP: {details.current_ip}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {new Date(alert.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {alert.status === 'pending' && (
                                <button
                                  onClick={() => resolveAlert(alert.id, 'reviewed')}
                                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg"
                                >
                                  Resolve
                                </button>
                              )}
                              {alert.status === 'resolved' && (
                                <span className="text-green-500 text-sm">✓ Resolved</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {alerts.length === 0 && (
                    <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No security alerts found
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<any> = ({ title, value, icon, color, darkMode }) => {
  const colorMap: any = {
    blue: 'from-blue-600 to-blue-800',
    purple: 'from-purple-600 to-purple-800',
    green: 'from-green-600 to-green-800',
    yellow: 'from-yellow-600 to-yellow-800'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-6 shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm">{title}</p>
          <h3 className="text-3xl font-bold mt-2 text-white">{value}</h3>
        </div>
        <div className="text-white/80">
          {React.cloneElement(icon, { className: 'w-12 h-12' })}
        </div>
      </div>
    </motion.div>
  );
};

// System Card Component
const SystemCard: React.FC<any> = ({ system, darkMode, onEdit, onManagePlans, onDelete }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`rounded-2xl p-6 border ${
        darkMode 
          ? 'bg-gray-800/50 border-purple-500/20' 
          : 'bg-white/80 border-purple-200'
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{system.name}</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {system.category}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          system.status === 'active'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {system.status}
        </span>
      </div>
      
      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {system.description}
      </p>
      
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onEdit}
          className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
        >
          <Edit className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={onManagePlans}
          className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
        >
          <Package className="w-3 h-3" />
          Plans
        </button>
        <button
          onClick={() => onDelete(system.id)}
          className="bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </motion.div>
  );
};

// Add System Modal
const AddSystemModal: React.FC<any> = ({ darkMode, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    python_file_path: '',
    icon_url: '',
    features: '',
    version: '1.0.0'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const featuresArray = formData.features.split('\n').filter((f: string) => f.trim());
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/systems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          ...formData,
          features: JSON.stringify(featuresArray)
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert('Failed to create system');
      }
    } catch (error) {
      console.error('Error creating system:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-2xl rounded-2xl p-8 my-8 h-[95vh] overflow-y-scroll ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add New System</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">System Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="e.g., Gym Management System"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={3}
              placeholder="Describe your system..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                placeholder="e.g., Fitness"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <input
                type="text"
                required
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Python File Path</label>
            <input
              type="text"
              value={formData.python_file_path}
              onChange={(e) => setFormData({ ...formData, python_file_path: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="systems/gym_management.py"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Icon URL</label>
            <input
              type="text"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Features (one per line)</label>
            <textarea
              required
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={4}
              placeholder="Member Management&#10;Class Scheduling&#10;Payment Processing"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create System'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Edit System Modal
const EditSystemModal: React.FC<any> = ({ darkMode, system, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: system.name,
    description: system.description,
    category: system.category,
    python_file_path: system.python_file_path || '',
    icon_url: system.icon_url || '',
    features: Array.isArray(system.features) ? system.features.join('\n') : '',
    version: system.version || '1.0.0',
    status: system.status
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const featuresArray = formData.features.split('\n').filter((f: string) => f.trim());
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/systems/${system.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          ...formData,
          features: JSON.stringify(featuresArray)
        })
      });

      if (response.ok) {
        onSuccess();
      } else {
        alert('Failed to update system');
      }
    } catch (error) {
      console.error('Error updating system:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-2xl rounded-2xl p-8 my-8 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Edit System</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">System Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Version</label>
              <input
                type="text"
                required
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Python File Path</label>
              <input
                type="text"
                value={formData.python_file_path}
                onChange={(e) => setFormData({ ...formData, python_file_path: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Icon URL</label>
            <input
              type="text"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Features (one per line)</label>
            <textarea
              required
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className={`w-full px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              }`}
              rows={4}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update System'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Manage Plans Modal
const ManagePlansModal: React.FC<any> = ({ darkMode, system, onClose }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    billing_cycle: 'monthly',
    features: '',
    max_users: '',
    max_storage_gb: '',
    support_level: 'email'
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/systems/${system.id}/plans`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setLoading(false);
    }
  };

  const handleAddPlan = () => {
    setPlanForm({
      name: '',
      description: '',
      price: '',
      billing_cycle: 'monthly',
      features: '',
      max_users: '',
      max_storage_gb: '',
      support_level: 'email'
    });
    setEditingPlan(null);
    setShowAddPlan(true);
  };

  const handleEditPlan = (plan: any) => {
    setPlanForm({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      billing_cycle: plan.billing_cycle,
      features: Array.isArray(plan.features) ? plan.features.join('\n') : '',
      max_users: plan.max_users?.toString() || '',
      max_storage_gb: plan.max_storage_gb?.toString() || '',
      support_level: plan.support_level || 'email'
    });
    setEditingPlan(plan);
    setShowAddPlan(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const featuresArray = planForm.features.split('\n').filter((f: string) => f.trim());
      const payload = {
        system_id: system.id,
        name: planForm.name,
        description: planForm.description,
        price: parseFloat(planForm.price),
        billing_cycle: planForm.billing_cycle,
        features: JSON.stringify(featuresArray),
        max_users: parseInt(planForm.max_users) || null,
        max_storage_gb: parseFloat(planForm.max_storage_gb) || null,
        support_level: planForm.support_level
      };

      const url = editingPlan 
        ? `${import.meta.env.VITE_API_URL}/api/saas/admin/plans/${editingPlan.id}`
        : `${import.meta.env.VITE_API_URL}/api/saas/admin/plans`;
      
      const response = await fetch(url, {
        method: editingPlan ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowAddPlan(false);
        fetchPlans();
      } else {
        alert('Failed to save plan');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        fetchPlans();
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-4xl rounded-2xl p-8 my-8 h-[95vh] overflow-y-scroll ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Manage Plans</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {system.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!showAddPlan ? (
          <>
            <button
              onClick={handleAddPlan}
              className="w-full mb-4 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add New Plan
            </button>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : plans.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No plans yet. Add your first plan!
              </p>
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-purple-500/20' : 'bg-gray-50 border-purple-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {plan.description}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span className="text-purple-400 font-bold">${plan.price}/{plan.billing_cycle}</span>
                          <span>Max Users: {plan.max_users || 'Unlimited'}</span>
                          <span>Storage: {plan.max_storage_gb || 'Unlimited'}GB</span>
                          <span>Support: {plan.support_level}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPlan(plan)}
                          className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-2 bg-red-600 hover:bg-red-500 text-white rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSavePlan} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="e.g., Basic, Pro, Enterprise"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Price</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="99.99"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                required
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                rows={2}
                placeholder="Plan description..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Billing Cycle</label>
                <select
                  value={planForm.billing_cycle}
                  onChange={(e) => setPlanForm({ ...planForm, billing_cycle: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Support Level</label>
                <select
                  value={planForm.support_level}
                  onChange={(e) => setPlanForm({ ...planForm, support_level: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <option value="email">Email</option>
                  <option value="priority">Priority</option>
                  <option value="24/7">24/7</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Max Users</label>
                <input
                  type="number"
                  value={planForm.max_users}
                  onChange={(e) => setPlanForm({ ...planForm, max_users: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Storage (GB)</label>
                <input
                  type="number"
                  step="0.1"
                  value={planForm.max_storage_gb}
                  onChange={(e) => setPlanForm({ ...planForm, max_storage_gb: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Features (one per line)</label>
              <textarea
                value={planForm.features}
                onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                }`}
                rows={4}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddPlan(false)}
                className={`flex-1 py-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default SaaSDashboard;

