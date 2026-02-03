import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Monitor, AlertCircle } from 'lucide-react';
import AdminHeader from '../components/AdminHeader';
import AdminFooter from '../components/AdminFooter';

interface SecurityAlert {
  id: number;
  subscription_id: number;
  alert_type: 'concurrent_use' | 'device_limit_exceeded' | 'suspicious_location' | 'rapid_activations';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'reviewed' | 'resolved' | 'ignored';
  details: any;
  device_fingerprint: string;
  ip_address: string;
  created_at: string;
  company_name: string;
  system_name: string;
}

interface PendingDevice {
  id: number;
  subscription_id: number;
  device_fingerprint: string;
  device_name: string;
  device_info: any;
  status: 'pending' | 'active' | 'rejected';
  first_activated: string;
  ip_address: string;
  company_name: string;
  system_name: string;
  active_count: number;
  max_activations: number;
}

const SecurityDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'alerts' | 'devices'>('devices');
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  useEffect(() => {
    fetchSecurityData();
  }, [filterStatus]);

  const fetchSecurityData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch security alerts
      const alertsRes = await fetch(`http://localhost:5001/api/saas/admin/security/alerts?status=${filterStatus}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const alertsData = await alertsRes.json();
      
      // Fetch pending devices
      const devicesRes = await fetch('http://localhost:5001/api/saas/admin/security/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const devicesData = await devicesRes.json();
      
      setAlerts(alertsData.alerts || []);
      setPendingDevices(devicesData.devices || []);
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveDevice = async (deviceId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/saas/admin/security/devices/${deviceId}/approve`, {
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
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/saas/admin/security/devices/${deviceId}/reject`, {
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
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/saas/admin/security/alerts/${alertId}/resolve`, {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading security dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <AdminHeader />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Security Dashboard</h1>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'devices'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Monitor className="w-4 h-4 inline mr-2" />
              Pending Devices ({pendingDevices.length})
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Security Alerts ({alerts.filter(a => a.status === 'pending').length})
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Devices</p>
                <p className="text-3xl font-bold text-white mt-2">{pendingDevices.length}</p>
              </div>
              <Clock className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-500 mt-2">
                  {alerts.filter(a => a.severity === 'critical' && a.status === 'pending').length}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Concurrent Use</p>
                <p className="text-3xl font-bold text-orange-500 mt-2">
                  {alerts.filter(a => a.alert_type === 'concurrent_use' && a.status === 'pending').length}
                </p>
              </div>
              <Monitor className="w-10 h-10 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Resolved Today</p>
                <p className="text-3xl font-bold text-green-500 mt-2">
                  {alerts.filter(a => a.status === 'resolved').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
        </div>

        {/* Pending Devices Table */}
        {activeTab === 'devices' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Pending Device Activations</h2>
              <p className="text-gray-400 text-sm mt-1">Review and approve device activation requests</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">System</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Devices</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {pendingDevices.map((device) => {
                    const deviceInfo = typeof device.device_info === 'string' 
                      ? JSON.parse(device.device_info) 
                      : device.device_info;
                    
                    return (
                      <tr key={device.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-white">{device.company_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{device.system_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">{device.device_name}</div>
                          <div className="text-xs text-gray-400">{deviceInfo?.os} {deviceInfo?.os_version}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{device.ip_address}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
                            {device.active_count} / {device.max_activations}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
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
                <div className="text-center py-12 text-gray-400">
                  No pending device activations
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Alerts Table */}
        {activeTab === 'alerts' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Security Alerts</h2>
                <p className="text-gray-400 text-sm mt-1">Monitor and respond to security threats</p>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              >
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="">All</option>
              </select>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {alerts.map((alert) => {
                    const details = typeof alert.details === 'string' 
                      ? JSON.parse(alert.details) 
                      : alert.details;
                    
                    return (
                      <tr key={alert.id} className="hover:bg-gray-750">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-white">
                            {getAlertIcon(alert.alert_type)}
                            <span className="text-sm">{alert.alert_type.replace(/_/g, ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white">{alert.company_name}</div>
                          <div className="text-xs text-gray-400">{alert.system_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{details?.message}</div>
                          {details?.current_ip && (
                            <div className="text-xs text-gray-400">IP: {details.current_ip}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">
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
                <div className="text-center py-12 text-gray-400">
                  No security alerts found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <AdminFooter />
    </div>
  );
};

export default SecurityDashboard;
