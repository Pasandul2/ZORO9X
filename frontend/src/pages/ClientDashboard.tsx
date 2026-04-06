import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Key, Calendar,
  Activity, AlertCircle, Copy, Download, ExternalLink,
  Server, Check, Phone, Mail, Edit, Building2,
  Eye, EyeOff, Shield, Clock, HardDrive, Wifi, WifiOff,
  Archive, RefreshCw
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
  contact_email?: string;
  contact_phone?: string;
  business_address?: string;
  website?: string;
  tax_id?: string;
  logo_url?: string;
  system_features: string[];
  plan_features: string[];
  // Security fields
  device_count?: number;
  max_devices?: number;
  activation_count?: number;
  max_activations?: number;
  is_activated?: boolean;
  days_remaining?: number | null;
  renewal_countdown_days?: number | null;
  renewal_recommended?: boolean;
  renewal_message?: string | null;
}

interface SecurityInfo {
  device_count: number;
  max_devices: number;
  activation_count: number;
  max_activations: number;
  downloads_remaining: number;
  last_seen: string | null;
  days_offline: number;
  grace_period_days: number;
  heartbeat_window_minutes?: number;
  requires_online_revalidation?: boolean;
  online_status?: boolean;
  is_activated: boolean;
  subscription_status?: string;
  payment_status?: string;
  is_expired?: boolean;
  can_renew_now?: boolean;
  can_request_early_renewal?: boolean;
}

interface ActiveDevice {
  id: number;
  device_name: string;
  mac_address: string | null;
  ip_address: string | null;
  first_activated: string | null;
  last_seen: string | null;
}

interface BusinessInfo {
  subscription_id: number;
  system_id: number;
  client_id: number;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  business_address: string;
  website: string;
  tax_id: string;
  logo_url: string | null;
  system_logo: string | null;
}

interface BusinessRequestStatus {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}

interface ServerBackup {
  id: number;
  backup_name: string;
  original_name?: string | null;
  file_size: number;
  source: string;
  created_at: string;
  uploaded_at: string;
  download_url: string;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ darkMode }) => {
  const MIN_DOWNLOAD_ANIMATION_MS = 2200;
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo | null>(null);
  const [activeDevices, setActiveDevices] = useState<ActiveDevice[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [latestBusinessRequest, setLatestBusinessRequest] = useState<BusinessRequestStatus | null>(null);
  const [showBusinessInfoEditDialog, setShowBusinessInfoEditDialog] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    website: '',
    tax_id: '',
    use_system_logo: false,
    remove_logo: false,
    logo: null as File | null,
  });
  const [businessLogoPreview, setBusinessLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloadingInstaller, setIsDownloadingInstaller] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState('Preparing installer package...');
  const [showDownloadComplete, setShowDownloadComplete] = useState(false);
  const [showExpiredRenewalPopup, setShowExpiredRenewalPopup] = useState(false);
  const [expiredPopupSubscriptionId, setExpiredPopupSubscriptionId] = useState<number | null>(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'overview' | 'backups'>('overview');
  const [serverBackups, setServerBackups] = useState<ServerBackup[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupsError, setBackupsError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!businessForm.logo) {
      setBusinessLogoPreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(businessForm.logo);
    setBusinessLogoPreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [businessForm.logo]);

  useEffect(() => {
    if (!showDownloadComplete) {
      return;
    }

    const hideTimer = window.setTimeout(() => {
      setShowDownloadComplete(false);
    }, 3500);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [showDownloadComplete]);

  // Helper component for progress bar
  const ProgressBar: React.FC<{ 
    current: number; 
    max: number; 
    label: string; 
    color?: string;
    showNumbers?: boolean;
  }> = ({ current, max, label, color = 'purple', showNumbers = true }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    const remaining = max - current;
    
    const colorClasses = {
      purple: 'bg-purple-600',
      green: 'bg-green-600',
      blue: 'bg-blue-600',
      yellow: 'bg-yellow-600',
      red: 'bg-red-600'
    };
    
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          {showNumbers && (
            <span className="text-sm font-bold">
              {current}/{max}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full ${colorClasses[color as keyof typeof colorClasses]} transition-all duration-500 rounded-full`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        {remaining > 0 && (
          <p className="text-xs text-gray-400 mt-1">{remaining} remaining</p>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    setActiveDashboardTab('overview');
    setServerBackups([]);
    setBackupsError('');
  }, [selectedSubscription?.id]);

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

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

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
    
    // Fetch security information
    try {
      const secResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/security`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (secResponse.ok) {
        const secData = await secResponse.json();
        const daysOffline = Number(secData.security.days_offline || 0);
        const graceDays = Number(secData.security.grace_period_days || 7);
        
        setSecurityInfo({
          device_count: secData.security.device_count || 0,
          max_devices: secData.security.max_devices || 3,
          activation_count: secData.security.activation_count || 0,
          max_activations: secData.security.max_activations || 3,
          downloads_remaining: (secData.security.max_activations || 3) - (secData.security.activation_count || 0),
          last_seen: secData.security.last_seen || null,
          days_offline: daysOffline,
          grace_period_days: graceDays,
          heartbeat_window_minutes: Number(secData.security.heartbeat_window_minutes || 3),
          online_status: !!secData.security.online_status,
          is_activated: secData.security.is_activated || false,
          subscription_status: secData.security.subscription_status,
          payment_status: secData.security.payment_status,
          can_renew_now: !!secData.security.can_renew_now,
          can_request_early_renewal: !!secData.security.can_request_early_renewal,
        });
      }
    } catch (error) {
      console.error('Error fetching security info:', error);
      // Set default security info if API fails
      setSecurityInfo({
        device_count: 0,
        max_devices: 3,
        activation_count: 0,
        max_activations: 3,
        downloads_remaining: 3,
        last_seen: null,
        days_offline: 0,
        grace_period_days: 7,
        heartbeat_window_minutes: 3,
        online_status: false,
        is_activated: false,
        subscription_status: 'unknown',
        payment_status: 'unknown',
        can_renew_now: false,
        can_request_early_renewal: false,
      });
    }

    // Fetch active devices list with MAC addresses
    try {
      const devicesResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/devices`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        setActiveDevices(devicesData.devices || []);
      } else {
        setActiveDevices([]);
      }
    } catch (error) {
      console.error('Error fetching active devices:', error);
      setActiveDevices([]);
    }

    await fetchBusinessInfo(subscriptionId);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const resolveImageSrc = (url?: string | null) => {
    if (!url) {
      return null;
    }

    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL}${url}`;
  };

  const formatBackupSize = (size: number) => {
    if (!size || size <= 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const fetchServerBackups = async (subscriptionId: number) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    setBackupsLoading(true);
    setBackupsError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/backups`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load backups');
      }

      setServerBackups(data?.backups || []);
    } catch (error) {
      console.error('Error fetching server backups:', error);
      setServerBackups([]);
      setBackupsError(error instanceof Error ? error.message : 'Failed to load backups');
    } finally {
      setBackupsLoading(false);
    }
  };

  const handleDownloadServerBackup = async (backup: ServerBackup) => {
    if (!selectedSubscription) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${backup.download_url}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = backup.backup_name || 'backup.db';
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert(error instanceof Error ? error.message : 'Failed to download backup');
    }
  };

  const getDownloadFilename = (response: Response) => {
    const contentDisposition = response.headers.get('Content-Disposition');

    const ensureExeFilename = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return 'system_installer.exe';
      }

      if (/\.exe$/i.test(trimmed)) {
        return trimmed;
      }

      return `${trimmed.replace(/\.[^/.\\]+$/i, '')}.exe`;
    };

    if (contentDisposition) {
      const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
      if (utf8Match?.[1]) {
        return ensureExeFilename(decodeURIComponent(utf8Match[1]));
      }

      const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
      if (quotedMatch?.[1]) {
        return ensureExeFilename(quotedMatch[1]);
      }

      const plainMatch = /filename=([^;]+)/i.exec(contentDisposition);
      if (plainMatch?.[1]) {
        return ensureExeFilename(plainMatch[1]);
      }
    }

    return 'system_installer.exe';
  };

  const initiateDownload = () => {
    downloadSystemFile();
  };

  const actualSubscriptionStatus = String(
    securityInfo?.subscription_status || selectedSubscription?.status || ''
  ).toLowerCase();
  const isExpiredSubscription = !!securityInfo?.is_expired || actualSubscriptionStatus === 'expired' || actualSubscriptionStatus === 'cancelled';
  const requiresOnlineRevalidation = !!securityInfo?.requires_online_revalidation;
  const showRenewalAction = isExpiredSubscription || requiresOnlineRevalidation;
  const countdownDays = selectedSubscription?.renewal_countdown_days ?? selectedSubscription?.days_remaining ?? null;
  const showRenewalCountdown = !isExpiredSubscription && typeof countdownDays === 'number' && countdownDays > 0 && countdownDays <= 3;

  useEffect(() => {
    if (!selectedSubscription) {
      setShowExpiredRenewalPopup(false);
      setExpiredPopupSubscriptionId(null);
      return;
    }

    if (isExpiredSubscription && expiredPopupSubscriptionId !== selectedSubscription.id) {
      setShowExpiredRenewalPopup(true);
      setExpiredPopupSubscriptionId(selectedSubscription.id);
    }
  }, [isExpiredSubscription, selectedSubscription, expiredPopupSubscriptionId]);

  useEffect(() => {
    if (activeDashboardTab !== 'backups' || !selectedSubscription) {
      return;
    }

    fetchServerBackups(selectedSubscription.id);
  }, [activeDashboardTab, selectedSubscription]);

  const fetchBusinessInfo = async (subscriptionId: number) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/business-info`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setBusinessInfo(data.businessInfo || null);
      setLatestBusinessRequest(data.latestRequest || null);

      if (data.businessInfo) {
        setBusinessForm({
          company_name: data.businessInfo.company_name || '',
          contact_email: data.businessInfo.contact_email || '',
          contact_phone: data.businessInfo.contact_phone || '',
          business_address: data.businessInfo.business_address || '',
          website: data.businessInfo.website || '',
          tax_id: data.businessInfo.tax_id || '',
          use_system_logo: false,
          remove_logo: false,
          logo: null,
        });
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }
  };

  const openBusinessInfoEdit = () => {
    if (!selectedSubscription) return;
    setShowBusinessInfoEditDialog(true);
  };

  const handleBusinessLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setBusinessForm((prev) => ({
      ...prev,
      logo: file,
      remove_logo: false,
      use_system_logo: false,
    }));
  };

  const submitBusinessInfoChangeRequest = async () => {
    if (!selectedSubscription) return;

    if (!businessForm.company_name || !businessForm.contact_email || !businessForm.contact_phone) {
      alert('Company name, contact email, and contact phone are required');
      return;
    }

    setIsGenerating(true);
    const token = localStorage.getItem('token');

    try {
      const payload = new FormData();
      payload.append('company_name', businessForm.company_name);
      payload.append('contact_email', businessForm.contact_email);
      payload.append('contact_phone', businessForm.contact_phone);
      payload.append('business_address', businessForm.business_address);
      payload.append('website', businessForm.website);
      payload.append('tax_id', businessForm.tax_id);
      payload.append('use_system_logo', businessForm.use_system_logo ? 'true' : 'false');
      payload.append('remove_logo', businessForm.remove_logo ? 'true' : 'false');

      if (businessForm.logo) {
        payload.append('logo', businessForm.logo);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${selectedSubscription.id}/business-info/change-request`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: payload,
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.message || 'Failed to submit business information update request');
        return;
      }

      alert(data?.message || 'Business information update request submitted');
      setShowBusinessInfoEditDialog(false);
      await fetchBusinessInfo(selectedSubscription.id);
      await fetchSubscriptions();
    } catch (error) {
      console.error('Error submitting business info request:', error);
      alert('Failed to submit request');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadSystemFile = async () => {
    if (!selectedSubscription) return;

    setIsDownloadingInstaller(true);
    setShowDownloadComplete(false);
    setDownloadProgress(0);
    setDownloadMessage('Preparing installer package...');
    const token = localStorage.getItem('token');
    const downloadStartedAt = Date.now();
    const progressMessages = [
      'Preparing installer package...',
      'Applying secure installer profile...',
      'Downloading installer files...',
      'Finalizing secure installer...',
    ];
    let measuredProgress = 0;
    let downloadCompleted = false;

    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - downloadStartedAt;
      const simulatedProgress = Math.min(
        Math.floor((elapsed / MIN_DOWNLOAD_ANIMATION_MS) * 92),
        92
      );
      const nextProgress = Math.max(simulatedProgress, measuredProgress);
      const messageIndex = Math.min(
        progressMessages.length - 1,
        Math.floor((nextProgress / 100) * progressMessages.length)
      );

      setDownloadProgress(nextProgress);
      setDownloadMessage(progressMessages[messageIndex]);
    }, 120);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/download/${selectedSubscription.id}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const filename = getDownloadFilename(response);

        let blob: Blob;
        const totalBytes = Number(response.headers.get('Content-Length') || '0');

        if (response.body) {
          const reader = response.body.getReader();
          const chunks: BlobPart[] = [];
          let receivedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            if (value) {
              chunks.push(value);
              receivedBytes += value.length;

              if (totalBytes > 0) {
                measuredProgress = Math.max(
                  measuredProgress,
                  Math.min(Math.floor((receivedBytes / totalBytes) * 100), 98)
                );
              }
            }
          }

          blob = new Blob(chunks);
          if (!totalBytes) {
            measuredProgress = 96;
          }
        } else {
          blob = await response.blob();
          measuredProgress = 96;
        }

        const elapsed = Date.now() - downloadStartedAt;
        const remainingAnimationTime = Math.max(0, MIN_DOWNLOAD_ANIMATION_MS - elapsed);
        if (remainingAnimationTime > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remainingAnimationTime));
        }

        setDownloadProgress(100);
        setDownloadMessage('Installer download completed successfully.');

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        downloadCompleted = true;
        setShowDownloadComplete(true);
        await new Promise((resolve) => window.setTimeout(resolve, 450));
      } else {
        let message = 'Failed to download installer. Please try again.';
        try {
          const error = await response.json();
          message = error.message || message;
        } catch {
          const errorText = await response.text();
          if (errorText) {
            message = errorText;
          }
        }
        alert(message);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading installer');
    } finally {
      window.clearInterval(progressTimer);
      if (downloadCompleted) {
        setIsDownloadingInstaller(false);
      } else {
        setDownloadProgress(0);
        setDownloadMessage('Preparing installer package...');
        setIsDownloadingInstaller(false);
      }
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
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveDashboardTab('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                  activeDashboardTab === 'overview'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : darkMode
                    ? 'bg-gray-900 text-gray-300 border-gray-700'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveDashboardTab('backups')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
                  activeDashboardTab === 'backups'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : darkMode
                    ? 'bg-gray-900 text-gray-300 border-gray-700'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                <Archive className="w-4 h-4" />
                Backups
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={activeDashboardTab === 'overview' ? 'grid md:grid-cols-3 gap-6' : 'hidden'}
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
                      actualSubscriptionStatus === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {securityInfo?.subscription_status || selectedSubscription.status}
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

                {showRenewalCountdown && (
                  <div className={`mt-5 rounded-lg border p-4 ${
                    darkMode ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-100' : 'bg-yellow-50 border-yellow-300 text-yellow-900'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">Subscription expires in {countdownDays} day(s)</p>
                        <p className="text-sm mt-1">Renew early now to avoid service interruption.</p>
                      </div>
                      <button
                        onClick={() => navigate(`/client-dashboard/renewal/${selectedSubscription.id}`)}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
                      >
                        Renew Now
                      </button>
                    </div>
                  </div>
                )}

                {showRenewalAction && (
                  <div className={`mt-5 rounded-lg border p-4 ${
                    darkMode ? 'bg-red-500/10 border-red-500/30 text-red-200' : 'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    <p className="font-semibold">Renewal/Recovery action required</p>
                    <p className="text-sm mt-1">
                      {isExpiredSubscription
                        ? 'Subscription needs renewal. Open Renewal Access below to submit payment verification.'
                        : 'Application appears blocked by offline validation timeout. Open Renewal Access or reconnect internet in app to refresh status.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Renewal Actions */}
              <div className={`rounded-2xl p-6 border ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-purple-500" />
                  Renewal Access
                </h2>

                <div className={`rounded-lg p-4 border mb-5 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <p className="text-sm">
                    Renewal eligibility is checked using your system security status (API-key linked), not browser date calculations.
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/client-dashboard/renewal/${selectedSubscription.id}`)}
                  className={`${showRenewalAction ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'} text-white px-5 py-3 rounded-lg font-semibold mr-3`}
                >
                  Renewal & Payment Verification
                </button>

                {!showRenewalAction && (
                  <span className={`inline-block text-sm px-3 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-200'
                  }`}>
                    You can also renew early from this page.
                  </span>
                )}
              </div>

              {/* Business Information */}
              <div className={`rounded-2xl p-6 border ${
                darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4 gap-3">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Phone className="w-6 h-6 text-purple-500" />
                    Business Information
                  </h2>

                  <button
                    onClick={openBusinessInfoEdit}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit (Admin Approval)
                  </button>
                </div>

                <div className={`mb-4 p-3 rounded-lg border ${
                  latestBusinessRequest?.status === 'pending'
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                    : latestBusinessRequest?.status === 'rejected'
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-green-500/10 border-green-500/30 text-green-300'
                }`}>
                  <p className="text-sm font-medium">
                    Status: {latestBusinessRequest?.status || 'approved'}
                  </p>
                  {latestBusinessRequest?.admin_note && (
                    <p className="text-xs mt-1">Admin note: {latestBusinessRequest.admin_note}</p>
                  )}
                </div>

                <div className={`mb-4 p-3 rounded-lg border ${
                  darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  These business details are used by your system application after secure API-key validation. Any changes require admin approval.
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Company Name</label>
                    <p className="font-semibold">{businessInfo?.company_name || selectedSubscription.company_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Contact Email</label>
                    <p className="font-semibold">{businessInfo?.contact_email || selectedSubscription.contact_email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Contact Phone</label>
                    <p className="font-semibold">{businessInfo?.contact_phone || selectedSubscription.contact_phone || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Website</label>
                    <p className="font-semibold break-all">{businessInfo?.website || selectedSubscription.website || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Tax ID</label>
                    <p className="font-semibold">{businessInfo?.tax_id || selectedSubscription.tax_id || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Business Address</label>
                    <p className="font-semibold">{businessInfo?.business_address || selectedSubscription.business_address || '-'}</p>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="text-sm text-gray-400 mb-2 block">Business Logo</label>
                  {resolveImageSrc(businessInfo?.logo_url || selectedSubscription.logo_url) ? (
                    <img
                      src={resolveImageSrc(businessInfo?.logo_url || selectedSubscription.logo_url) || ''}
                      alt="Business logo"
                      className="w-20 h-20 rounded-lg object-cover border border-purple-500/30"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-lg border flex items-center justify-center text-xs ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      No logo
                    </div>
                  )}
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
                  Installer Packages
                </h2>
                
                <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Standard installer downloads as a ready-to-run EXE. Company details are fetched securely during installation after API key validation.
                </p>

                <div className={`rounded-xl border p-4 ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h3 className="font-semibold">Standard Installer</h3>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Download installer EXE without bundled business secrets. Installer verifies API key and loads profile online.
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                      Secure
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={initiateDownload}
                    disabled={isDownloadingInstaller}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    {isDownloadingInstaller ? 'Downloading Installer EXE...' : 'Download Standard Installer (.exe)'}
                  </motion.button>
                </div>
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

              {/* Security Features */}
              {securityInfo && (
                <div className={`rounded-2xl p-6 border ${
                  darkMode ? 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'
                }`}>
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    Security Features
                  </h3>
                  
                  <div className="space-y-5">
                    {/* Activation Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        securityInfo.is_activated 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {securityInfo.is_activated ? '✓ Activated' : '⚠ Not Activated'}
                      </span>
                    </div>

                    {/* Subscription + Payment State */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/20 rounded-lg p-3 border border-gray-700">
                        <p className="text-xs text-gray-400">Subscription</p>
                        <p className="text-sm font-semibold text-white mt-1 capitalize">
                          {securityInfo.subscription_status || 'unknown'}
                        </p>
                      </div>
                      <div className="bg-black/20 rounded-lg p-3 border border-gray-700">
                        <p className="text-xs text-gray-400">Payment</p>
                        <p className={`text-sm font-semibold mt-1 capitalize ${
                          securityInfo.payment_status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {securityInfo.payment_status || 'unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Active Devices */}
                    <ProgressBar 
                      current={securityInfo.device_count} 
                      max={securityInfo.max_devices} 
                      label="Active Devices"
                      color={securityInfo.device_count >= securityInfo.max_devices ? 'red' : 'green'}
                    />

                    {/* Downloads/Activations */}
                    <ProgressBar 
                      current={securityInfo.activation_count} 
                      max={securityInfo.max_activations} 
                      label="System Downloads"
                      color={securityInfo.downloads_remaining === 0 ? 'red' : securityInfo.downloads_remaining === 1 ? 'yellow' : 'blue'}
                    />

                    {/* Grace Period */}
                    <ProgressBar 
                      current={securityInfo.days_offline} 
                      max={securityInfo.grace_period_days} 
                      label="Offline Days"
                      color={securityInfo.days_offline >= securityInfo.grace_period_days ? 'red' : securityInfo.days_offline >= 5 ? 'yellow' : 'green'}
                    />

                    {/* Last Seen */}
                    <div className="pt-3 border-t border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        {securityInfo.online_status ? (
                          <>
                            <Wifi className="w-4 h-4 text-green-400" />
                            <span className="text-xs font-semibold text-green-400">Online</span>
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-semibold text-gray-400">Offline</span>
                          </>
                        )}
                      </div>
                      {securityInfo.last_seen && (
                        <p className="text-xs text-gray-400">
                          Last seen: {new Date(securityInfo.last_seen).toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Offline: {securityInfo.days_offline || 0} day(s) / Grace: {securityInfo.grace_period_days || 7} day(s)
                      </p>
                    </div>

                    {/* Warning Messages */}
                    {securityInfo.downloads_remaining === 0 && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="flex gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-300">
                            Download limit reached. Contact support to increase limit.
                          </p>
                        </div>
                      </div>
                    )}

                    {securityInfo.days_offline >= securityInfo.grace_period_days && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <div className="flex gap-2">
                          <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-yellow-300">
                            Offline grace period expired. System requires internet connection.
                          </p>
                        </div>
                      </div>
                    )}

                    {securityInfo.device_count >= securityInfo.max_devices && (
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                        <div className="flex gap-2">
                          <HardDrive className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-orange-300">
                            Device limit reached. New activations require admin approval.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Active Devices with MAC */}
                    <div className="pt-3 border-t border-gray-700">
                      <p className="text-sm font-semibold text-gray-200 mb-3">Activated Devices</p>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {activeDevices.length === 0 ? (
                          <p className="text-xs text-gray-400">No active devices yet.</p>
                        ) : (
                          activeDevices.map((device) => (
                            <div key={device.id} className="rounded-lg border border-gray-700 bg-black/20 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-white truncate">{device.device_name || 'Unknown Device'}</p>
                                <p className="text-xs text-gray-400">{device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never seen'}</p>
                              </div>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <p className="text-gray-300">MAC: <span className="text-cyan-300">{device.mac_address || 'N/A'}</span></p>
                                <p className="text-gray-300">IP: <span className="text-gray-200">{device.ip_address || 'N/A'}</span></p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
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

            {activeDashboardTab === 'backups' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-6 ${
                  darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Archive className="w-6 h-6 text-purple-500" />
                      Server Backups
                    </h2>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Backups uploaded from the desktop app are stored on the server and kept for the latest 50 copies.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectedSubscription && fetchServerBackups(selectedSubscription.id)}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <div className={`mb-4 rounded-lg border p-4 ${darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                  <p className="text-sm font-medium">Desktop backups sync automatically when the app reconnects online.</p>
                </div>

                {backupsLoading ? (
                  <div className="py-12 flex items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                  </div>
                ) : backupsError ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                    {backupsError}
                  </div>
                ) : serverBackups.length === 0 ? (
                  <div className={`rounded-lg border p-6 text-center ${darkMode ? 'border-gray-700 bg-gray-800/60 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    No backups have been uploaded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-700/30">
                    <table className="min-w-full divide-y divide-gray-700/30">
                      <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Backup</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Size</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Source</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Download</th>
                        </tr>
                      </thead>
                      <tbody className={darkMode ? 'divide-y divide-gray-700/30 bg-gray-900' : 'divide-y divide-gray-200 bg-white'}>
                        {serverBackups.map((backup) => (
                          <tr key={backup.id}>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{backup.backup_name}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {backup.original_name || 'Database backup'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{new Date(backup.uploaded_at || backup.created_at).toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm">{formatBackupSize(Number(backup.file_size || 0))}</td>
                            <td className="px-4 py-3 text-sm capitalize">{backup.source}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDownloadServerBackup(backup)}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>

      {isDownloadingInstaller && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-gray-800 border border-blue-500/30 rounded-2xl p-8 shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">⬇️</div>
              <h3 className="text-2xl font-bold text-white">Downloading Installer</h3>
              <p className="text-gray-300 mt-2">{downloadMessage}</p>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-green-500"
                animate={{ width: `${downloadProgress}%` }}
                transition={{ ease: 'easeOut', duration: 0.35 }}
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Downloading secure installer package</span>
              <span>{downloadProgress}%</span>
            </div>
          </motion.div>
        </div>
      )}

      {showExpiredRenewalPopup && selectedSubscription && (
        <div className="fixed inset-0 z-[55] bg-black/65 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md rounded-2xl border p-6 ${
              darkMode ? 'bg-gray-900 border-red-500/40 text-white' : 'bg-white border-red-300 text-gray-900'
            }`}
          >
            <h3 className="text-xl font-bold">Subscription Expired</h3>
            <p className="text-sm mt-2">
              Your subscription has expired. Renew now to reactivate this system immediately after admin approval.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowExpiredRenewalPopup(false)}
                className={`px-4 py-2 rounded-lg text-sm ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Later
              </button>
              <button
                onClick={() => {
                  setShowExpiredRenewalPopup(false);
                  navigate(`/client-dashboard/renewal/${selectedSubscription.id}`);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
              >
                Renew Now
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showDownloadComplete && (
        <div className="fixed top-6 right-6 z-[60]">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-600 text-white px-5 py-4 rounded-xl shadow-2xl border border-green-400/30"
          >
            <div className="font-semibold">Installer download complete</div>
            <div className="text-sm text-green-50 mt-1">Your installer EXE is ready to run.</div>
          </motion.div>
        </div>
      )}

      {/* Business Information Edit Dialog */}
      {showBusinessInfoEditDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => !isGenerating && setShowBusinessInfoEditDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
              darkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <h2 className="text-3xl font-bold mb-2">Edit Business Information</h2>
            <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Submit changes for admin approval. Approved information is used by the system application after secure API-key validation.
            </p>

            <div className={`mb-5 p-3 rounded-lg border ${darkMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
              Notice: These details are used inside the desktop application. Please provide accurate information.
            </div>

            <div className="space-y-5">
              {/* Logo Upload */}
              <div>
                <label className="block font-semibold mb-2">
                  Business Logo
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={businessForm.use_system_logo}
                      onChange={(e) =>
                        setBusinessForm((prev) => ({
                          ...prev,
                          use_system_logo: e.target.checked,
                          remove_logo: false,
                          logo: e.target.checked ? null : prev.logo,
                        }))
                      }
                      disabled={isGenerating}
                    />
                    Use system logo image
                  </label>

                  <label className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm cursor-pointer">
                    Browse Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBusinessLogoUpload}
                      className="hidden"
                      disabled={isGenerating}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      setBusinessForm((prev) => ({
                        ...prev,
                        logo: null,
                        use_system_logo: false,
                        remove_logo: true,
                      }))
                    }
                    disabled={isGenerating}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm disabled:opacity-50"
                  >
                    Delete Logo
                  </button>
                </div>

                <div className="mt-3">
                  {businessForm.remove_logo ? (
                    <div className={`w-20 h-20 rounded-lg border flex items-center justify-center text-xs ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      No logo
                    </div>
                  ) : businessForm.logo ? (
                    <img
                      src={businessLogoPreview || ''}
                      alt="Selected logo"
                      className="w-20 h-20 rounded-lg object-cover border border-purple-500/30"
                    />
                  ) : businessForm.use_system_logo && resolveImageSrc(businessInfo?.system_logo) ? (
                    <img
                      src={resolveImageSrc(businessInfo?.system_logo) || ''}
                      alt="System logo"
                      className="w-20 h-20 rounded-lg object-cover border border-purple-500/30"
                    />
                  ) : resolveImageSrc(businessInfo?.logo_url || selectedSubscription?.logo_url) ? (
                    <img
                      src={resolveImageSrc(businessInfo?.logo_url || selectedSubscription?.logo_url) || ''}
                      alt="Business logo"
                      className="w-20 h-20 rounded-lg object-cover border border-purple-500/30"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-lg border flex items-center justify-center text-xs ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      No logo
                    </div>
                  )}
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
                    value={businessForm.company_name}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, company_name: e.target.value }))}
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
                    value={businessForm.contact_phone}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, contact_phone: e.target.value }))}
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
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={businessForm.contact_email}
                    onChange={(e) => setBusinessForm(prev => ({ ...prev, contact_email: e.target.value }))}
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
                  value={businessForm.business_address}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, business_address: e.target.value }))}
                  placeholder="Street address, City, Country"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Website</label>
                <input
                  type="text"
                  value={businessForm.website}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block font-semibold mb-2">Tax ID</label>
                <input
                  type="text"
                  value={businessForm.tax_id}
                  onChange={(e) => setBusinessForm(prev => ({ ...prev, tax_id: e.target.value }))}
                  placeholder="Tax / business registration number"
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
                onClick={() => setShowBusinessInfoEditDialog(false)}
                disabled={isGenerating}
                className={`flex-1 py-3 rounded-lg font-semibold ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Cancel
              </button>
              <button
                onClick={submitBusinessInfoChangeRequest}
                disabled={isGenerating || !businessForm.company_name || !businessForm.contact_phone || !businessForm.contact_email}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Edit className="w-5 h-5" />
                    Submit For Approval
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Required fields are marked with *
            </p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ClientDashboard;
