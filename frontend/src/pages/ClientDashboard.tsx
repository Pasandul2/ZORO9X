import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Key, Database, Calendar, DollarSign, 
  Activity, AlertCircle, Copy, Download, ExternalLink,
  TrendingUp, Users, Server, Check, Upload, Building2, Phone, Mail,
  Eye, EyeOff
} from 'lucide-react';

interface ClientDashboardProps {
  darkMode: boolean;
}

interface Subscription {
  id: number;
  system_name: string;
  system_description: string;
  icon_url: string;
  plan_name: string;
  price: number;
  billing_cycle: string;
  status: string;
  api_key: string;
  database_name: string;
  subdomain: string;
  start_date: string;
  end_date: string;
  company_name: string;
  system_features: string[];
  plan_features: string[];
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ darkMode }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [customizationData, setCustomizationData] = useState({
    business_name: '',
    address: '',
    phone: '',
    email: '',
    logo: null as File | null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/my-subscriptions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions);
        if (data.subscriptions.length > 0) {
          setSelectedSubscription(data.subscriptions[0]);
          fetchUsageStats(data.subscriptions[0].id);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setLoading(false);
    }
  };

  const fetchUsageStats = async (subscriptionId: number) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/usage`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setUsageStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const initiateDownload = () => {
    setShowCustomizationDialog(true);
    // Pre-fill business name from subscription
    if (selectedSubscription) {
      setCustomizationData(prev => ({
        ...prev,
        business_name: selectedSubscription.company_name || ''
      }));
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Logo file size must be less than 5MB');
        return;
      }
      setCustomizationData(prev => ({ ...prev, logo: file }));
    }
  };

  const downloadSystemFile = async () => {
    if (!selectedSubscription) return;
    
    // Validate required fields
    if (!customizationData.business_name || !customizationData.phone) {
      alert('Please fill in Business Name and Phone (required fields)');
      return;
    }

    setIsGenerating(true);
    const token = localStorage.getItem('token');
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('subscription_id', selectedSubscription.id.toString());
      formData.append('business_name', customizationData.business_name);
      formData.append('address', customizationData.address);
      formData.append('phone', customizationData.phone);
      formData.append('email', customizationData.email);
      if (customizationData.logo) {
        formData.append('logo', customizationData.logo);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/generate-custom-system`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      );

      if (response.ok) {
        // Get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'system_installer.zip';
        
        if (contentDisposition) {
          const matches = /filename="([^"]+)"/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }
        
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Close dialog and reset
        setShowCustomizationDialog(false);
        setCustomizationData({
          business_name: '',
          address: '',
          phone: '',
          email: '',
          logo: null
        });
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to generate system. Please try again.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error generating customized system');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: number) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        alert('Subscription cancelled successfully');
        fetchSubscriptions();
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 ${
        darkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Package className="w-24 h-24 mx-auto mb-6 text-purple-500" />
            <h2 className="text-3xl font-bold mb-4">No Active Subscriptions</h2>
            <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              You haven't purchased any systems yet. Browse our marketplace to get started!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/marketplace')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-lg font-semibold"
            >
              Browse Systems
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-32 pb-20 px-4 ${
      darkMode ? 'bg-black text-white' : 'bg-white text-black'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2">My Systems Dashboard</h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Manage your active subscriptions and systems
          </p>
        </motion.div>

        {/* Subscriptions Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {subscriptions.map((subscription, index) => (
            <motion.div
              key={subscription.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => {
                setSelectedSubscription(subscription);
                fetchUsageStats(subscription.id);
              }}
              className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedSubscription?.id === subscription.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : darkMode
                  ? 'border-gray-700 bg-gray-900 hover:border-purple-500/50'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{subscription.system_name}</h3>
                  <p className="text-sm text-purple-400">{subscription.plan_name}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  subscription.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : subscription.status === 'trial'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {subscription.status}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  ${subscription.price}/{subscription.billing_cycle}
                </span>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {new Date(subscription.end_date).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Selected Subscription Details */}
        {selectedSubscription && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Main Details */}
            <div className="md:col-span-2 space-y-6">
              {/* System Info Card */}
              <div className={`rounded-2xl p-6 border ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Server className="w-6 h-6 text-purple-500" />
                  System Information
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">System Name</label>
                    <p className="font-semibold">{selectedSubscription.system_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Plan</label>
                    <p className="font-semibold">{selectedSubscription.plan_name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Status</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedSubscription.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedSubscription.status}
                    </span>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Billing</label>
                    <p className="font-semibold">${selectedSubscription.price}/{selectedSubscription.billing_cycle}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Start Date</label>
                    <p className="font-semibold">
                      {new Date(selectedSubscription.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">End Date</label>
                    <p className="font-semibold">
                      {new Date(selectedSubscription.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* API Credentials Card */}
              <div className={`rounded-2xl p-6 border ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Key className="w-6 h-6 text-purple-500" />
                  API Credentials
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={selectedSubscription.api_key}
                        readOnly
                        className={`flex-1 px-4 py-3 rounded-lg font-mono text-sm ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="px-4 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg"
                        title={showApiKey ? "Hide API Key" : "Show API Key"}
                      >
                        {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(selectedSubscription.api_key, 'api')}
                        className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg"
                        title="Copy API Key"
                      >
                        {copiedKey === 'api' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Database Name</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedSubscription.database_name}
                        readOnly
                        className={`flex-1 px-4 py-3 rounded-lg font-mono text-sm ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}
                      />
                      <button
                        onClick={() => copyToClipboard(selectedSubscription.database_name, 'db')}
                        className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg"
                      >
                        {copiedKey === 'db' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Subdomain</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={selectedSubscription.subdomain}
                        readOnly
                        className={`flex-1 px-4 py-3 rounded-lg font-mono text-sm ${
                          darkMode ? 'bg-gray-800' : 'bg-gray-100'
                        }`}
                      />
                      <button
                        onClick={() => copyToClipboard(selectedSubscription.subdomain, 'subdomain')}
                        className="px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg"
                      >
                        {copiedKey === 'subdomain' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-400 mb-1">Keep Your API Key Secure</p>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        Never share your API key publicly. It provides full access to your system and data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download System */}
              <div className={`rounded-2xl p-6 border ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Download className="w-6 h-6 text-purple-500" />
                  Download System
                </h2>
                
                <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Download the Windows application to start using your system.
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={initiateDownload}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-lg font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download System Application
                </motion.button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Usage Stats */}
              {usageStats && (
                <div className={`rounded-2xl p-6 border ${
                  darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-500" />
                    Usage Statistics
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Requests</p>
                      <p className="text-2xl font-bold">{usageStats.total_requests}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-400">Unique IPs</p>
                      <p className="text-2xl font-bold">{usageStats.unique_ips}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-400">Active Days</p>
                      <p className="text-2xl font-bold">{usageStats.active_days}</p>
                    </div>
                    
                    {usageStats.last_request && (
                      <div>
                        <p className="text-sm text-gray-400">Last Request</p>
                        <p className="text-sm font-semibold">
                          {new Date(usageStats.last_request).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className={`rounded-2xl p-6 border ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className="font-bold mb-4">Actions</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => alert('Documentation coming soon')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Documentation
                  </button>
                  
                  <button
                    onClick={() => handleCancelSubscription(selectedSubscription.id)}
                    className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Customization Dialog */}
      {showCustomizationDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => !isGenerating && setShowCustomizationDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <h2 className="text-3xl font-bold mb-2">Customize Your System</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Provide your business details to generate a personalized installation package.
            </p>

            <div className="space-y-5">
              {/* Logo Upload */}
              <div>
                <label className="block font-semibold mb-2">
                  Business Logo
                  <span className="text-sm text-gray-400 font-normal ml-2">(Optional)</span>
                </label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  darkMode ? 'border-gray-700' : 'border-gray-300'
                }`}>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={isGenerating}
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    {customizationData.logo ? (
                      <div className="flex items-center justify-center gap-2">
                        <Check className="w-5 h-5 text-green-400" />
                        <span className="text-green-400">{customizationData.logo.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 mx-auto mb-2 text-purple-500" />
                        <p className="text-sm">Click to upload logo (PNG, JPG - Max 5MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Business Name */}
              <div>
                <label className="block font-semibold mb-2">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={customizationData.business_name}
                    onChange={(e) => setCustomizationData(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="Enter your business/gym name"
                    className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                    }`}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block font-semibold mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={customizationData.phone}
                    onChange={(e) => setCustomizationData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+993-XX-XXX-XXX"
                    className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                    }`}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block font-semibold mb-2">
                  Email Address
                  <span className="text-sm text-gray-400 font-normal ml-2">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={customizationData.email}
                    onChange={(e) => setCustomizationData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@yourbusiness.com"
                    className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                    }`}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block font-semibold mb-2">
                  Business Address
                  <span className="text-sm text-gray-400 font-normal ml-2">(Optional)</span>
                </label>
                <textarea
                  value={customizationData.address}
                  onChange={(e) => setCustomizationData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address, City, Country"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  disabled={isGenerating}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowCustomizationDialog(false)}
                disabled={isGenerating}
                className={`flex-1 py-3 rounded-lg font-semibold ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
              <button
                onClick={downloadSystemFile}
                disabled={isGenerating || !customizationData.business_name || !customizationData.phone}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Generate & Download
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              * Required fields must be filled to continue
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ClientDashboard;
