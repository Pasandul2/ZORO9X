import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, Download, CreditCard, Shield, Server, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface AdminSubscriptionDashboardProps {
  darkMode: boolean;
}

interface SubscriptionDetails {
  id: number;
  status: 'active' | 'cancelled' | 'expired' | string;
  company_name: string;
  contact_email?: string;
  contact_phone?: string;
  user_email?: string;
  system_name: string;
  system_description?: string;
  category?: string;
  system_version?: string;
  plan_name: string;
  plan_description?: string;
  billing_cycle?: string;
  price?: number | string;
  start_date?: string;
  end_date?: string;
  next_billing_date?: string;
  api_key?: string;
  subdomain?: string;
  database_name?: string;
  activation_count?: number;
  max_activations?: number;
  is_activated?: boolean;
  device_count?: number;
  max_devices?: number;
  system_features?: string[];
  plan_features?: string[];
}

interface UsageStats {
  total_requests: number;
  unique_ips: number;
  active_days: number;
  last_request: string | null;
  download_requests: number;
}

interface DownloadStats {
  total_downloads: number;
  last_download_at: string | null;
  max_downloads: number;
  used_downloads: number;
  remaining_downloads: number;
}

interface PaymentSummary {
  completed_total: number;
  completed_count: number;
  pending_count: number;
  failed_count: number;
  last_completed_payment: string | null;
}

interface PaymentItem {
  id: number;
  amount: number | string;
  currency?: string;
  payment_method?: string;
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | string;
  payment_date?: string;
  notes?: string;
}

interface DeviceItem {
  id: number;
  device_name?: string;
  device_id?: string;
  mac_address?: string;
  ip_address?: string;
  status: string;
  created_at?: string;
  last_seen?: string;
}

interface RenewalItem {
  id: number;
  amount: number | string;
  payment_method?: string;
  transaction_reference?: string;
  status: string;
  created_at?: string;
  payment_period_start?: string;
  payment_period_end?: string;
}

interface ActivityItem {
  id: number;
  event_type: string;
  actor?: string;
  details?: string;
  ip_address?: string;
  created_at?: string;
}

interface RuntimeStatus {
  application_live: boolean;
  offline_minutes: number | null;
  heartbeat_window_minutes: number;
  renewal_countdown_seconds: number | null;
  in_grace_period: boolean;
  grace_period_expired: boolean;
  effective_status: string;
  expired: boolean;
  is_lifetime: boolean;
  now: string;
}

interface DashboardPayload {
  subscription: SubscriptionDetails;
  usage: UsageStats;
  downloads: DownloadStats;
  payments: {
    summary: PaymentSummary;
    history: PaymentItem[];
  };
  devices: {
    active_count: number;
    total_count: number;
    max_devices: number;
    max_activations: number;
    activation_count: number;
    list: DeviceItem[];
  };
  runtime: RuntimeStatus;
  renewals: RenewalItem[];
  recent_activity: ActivityItem[];
}

const toCurrency = (value: number | string | undefined) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '0.00';
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
};

const formatCountdown = (seconds: number | null) => {
  if (seconds === null) return '-';
  if (seconds <= 0) return 'Expired';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
};

const statusBadgeClass = (status: string) => {
  if (status === 'active' || status === 'completed' || status === 'approved') {
    return 'bg-green-500/20 text-green-400';
  }
  if (status === 'pending') {
    return 'bg-yellow-500/20 text-yellow-400';
  }
  if (status === 'cancelled' || status === 'failed' || status === 'expired' || status === 'rejected') {
    return 'bg-red-500/20 text-red-400';
  }
  return 'bg-gray-500/20 text-gray-300';
};

const AdminSubscriptionDashboard: React.FC<AdminSubscriptionDashboardProps> = ({ darkMode }) => {
  const navigate = useNavigate();
  const { subscriptionId } = useParams<{ subscriptionId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'activity'>('overview');
  const [manageLoading, setManageLoading] = useState(false);
  const [manageNote, setManageNote] = useState('');
  const [extendDays, setExtendDays] = useState(30);
  const [setEndDate, setSetEndDate] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/saas/admin/subscriptions/${subscriptionId}/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to load subscription dashboard');
        }

        setDashboard(data.dashboard);
      } catch (fetchError: any) {
        setError(fetchError?.message || 'Failed to load subscription dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (subscriptionId) {
      fetchDashboard();
    } else {
      setError('Missing subscription id');
      setLoading(false);
    }
  }, [navigate, subscriptionId]);

  const refreshDashboard = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token || !subscriptionId) return;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/saas/admin/subscriptions/${subscriptionId}/dashboard`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to refresh subscription dashboard');
    }

    setDashboard(data.dashboard);
  };

  useEffect(() => {
    if (!subscriptionId) return;

    const intervalId = window.setInterval(() => {
      refreshDashboard().catch(() => {
        // Ignore transient polling errors and keep the last known state in UI.
      });
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [subscriptionId]);

  const runManageAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!dashboard || !subscriptionId) return;
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    try {
      setManageLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/admin/subscriptions/${subscriptionId}/manage`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: dashboard.subscription.api_key,
            action,
            note: manageNote || undefined,
            ...extra,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Failed to manage subscription');
      }

      await refreshDashboard();
      alert(data.message || 'Subscription updated successfully');
    } catch (manageError: any) {
      alert(manageError?.message || 'Failed to manage subscription');
    } finally {
      setManageLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen pt-24 pb-12 px-4 flex items-center justify-center ${
          darkMode
            ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white'
            : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
        }`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div
        className={`min-h-screen pt-24 pb-12 px-4 ${
          darkMode
            ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white'
            : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
        }`}
      >
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/admin/saas')}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to SaaS
          </button>
          <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-gray-800/50 border-red-500/40' : 'bg-white border-red-200'}`}>
            <h2 className="text-2xl font-bold mb-2">Unable to load subscription dashboard</h2>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{error || 'Unknown error'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { subscription, usage, downloads, payments, devices, runtime, renewals, recent_activity } = dashboard;

  return (
    <div
      className={`min-h-screen pt-24 pb-12 px-4 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white'
          : 'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 text-gray-900'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-start justify-between gap-4 mb-8"
        >
          <div>
            <button
              onClick={() => navigate('/admin/saas')}
              className={`mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-100 text-gray-800'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Back to SaaS
            </button>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
              <Server className="w-8 h-8 text-purple-400" />
              Subscription Dashboard
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {subscription.company_name} • {subscription.system_name}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusBadgeClass(subscription.status)}`}>
            {subscription.status}
          </span>
        </motion.div>

        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'manage', label: 'Manage Subscription' },
            { id: 'activity', label: 'Renewals & Activity' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'manage' | 'activity')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Downloads" value={String(downloads.total_downloads)} icon={<Download className="w-5 h-5" />} darkMode={darkMode} />
          <StatCard title="Remaining Downloads" value={String(downloads.remaining_downloads)} icon={<Activity className="w-5 h-5" />} darkMode={darkMode} />
          <StatCard title="Completed Payments" value={String(payments.summary.completed_count)} icon={<CreditCard className="w-5 h-5" />} darkMode={darkMode} />
          <StatCard title="Active Devices" value={`${devices.active_count}/${devices.max_devices || devices.total_count}`} icon={<Shield className="w-5 h-5" />} darkMode={darkMode} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Panel darkMode={darkMode} title="Subscription & System Details">
            <DetailRow label="Client" value={subscription.company_name} />
            <DetailRow label="Client Login" value={subscription.user_email || '-'} />
            <DetailRow label="Contact Email" value={subscription.contact_email || '-'} />
            <DetailRow label="Contact Phone" value={subscription.contact_phone || '-'} />
            <DetailRow label="System" value={subscription.system_name} />
            <DetailRow label="Category" value={subscription.category || '-'} />
            <DetailRow label="Version" value={subscription.system_version || '-'} />
            <DetailRow label="Plan" value={`${subscription.plan_name} (${subscription.billing_cycle || '-'})`} />
            <DetailRow label="Price" value={`$${toCurrency(subscription.price)}`} />
            <DetailRow label="Start Date" value={formatDate(subscription.start_date)} />
            <DetailRow label="End Date" value={formatDate(subscription.end_date)} />
            <DetailRow label="Next Billing" value={formatDate(subscription.next_billing_date)} />
          </Panel>

          <Panel darkMode={darkMode} title="Usage, Access & Downloads">
            <DetailRow label="API Total Requests" value={String(usage.total_requests)} />
            <DetailRow label="Unique IPs" value={String(usage.unique_ips)} />
            <DetailRow label="Active Days" value={String(usage.active_days)} />
            <DetailRow label="Last API Request" value={formatDate(usage.last_request)} />
            <DetailRow label="Download Requests" value={String(usage.download_requests)} />
            <DetailRow label="Total Installer Downloads" value={String(downloads.total_downloads)} />
            <DetailRow label="Last Download" value={formatDate(downloads.last_download_at)} />
            <DetailRow label="Activation Count" value={`${devices.activation_count}/${devices.max_activations}`} />
            <DetailRow label="Device Count" value={`${devices.active_count}/${devices.max_devices}`} />
            <DetailRow label="API Key" value={subscription.api_key || '-'} mono />
            <DetailRow label="Database" value={subscription.database_name || '-'} mono />
            <DetailRow label="Subdomain" value={subscription.subdomain || '-'} mono />
          </Panel>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <Panel darkMode={darkMode} title="Payments">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <MiniStat darkMode={darkMode} label="Completed Total" value={`$${toCurrency(payments.summary.completed_total)}`} />
              <MiniStat darkMode={darkMode} label="Last Completed" value={formatDate(payments.summary.last_completed_payment)} />
              <MiniStat darkMode={darkMode} label="Pending" value={String(payments.summary.pending_count)} />
              <MiniStat darkMode={darkMode} label="Failed" value={String(payments.summary.failed_count)} />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {payments.history.length === 0 && (
                <div className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>No payments recorded.</div>
              )}
              {payments.history.map((item) => (
                <div key={item.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-semibold">{item.currency || 'USD'} {toCurrency(item.amount)}</p>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{item.payment_method || 'N/A'} • {item.transaction_id || 'No Txn ID'}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(item.payment_date)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${statusBadgeClass(item.status)}`}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel darkMode={darkMode} title="Devices">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {devices.list.length === 0 && (
                <div className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>No device records found.</div>
              )}
              {devices.list.map((device) => (
                <div key={device.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-semibold">{device.device_name || device.device_id || `Device ${device.id}`}</p>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>IP: {device.ip_address || '-'}</p>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>MAC: {device.mac_address || '-'}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last seen: {formatDate(device.last_seen)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${statusBadgeClass(device.status)}`}>{device.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
          </>
        )}

        {activeTab === 'manage' && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Panel darkMode={darkMode} title="Real-Time Runtime Status">
              <DetailRow label="Application Live" value={runtime.application_live ? 'Live' : 'Offline'} />
              <DetailRow label="Effective Status" value={runtime.effective_status.replace(/_/g, ' ')} />
              <DetailRow label="Offline Minutes" value={runtime.offline_minutes !== null ? String(runtime.offline_minutes) : '-'} />
              <DetailRow label="Renewal Countdown" value={formatCountdown(runtime.renewal_countdown_seconds)} />
              <DetailRow label="In Grace Period" value={runtime.in_grace_period ? 'Yes' : 'No'} />
              <DetailRow label="Grace Period Expired" value={runtime.grace_period_expired ? 'Yes' : 'No'} />
              <DetailRow label="Expired" value={runtime.expired ? 'Yes' : 'No'} />
              <DetailRow label="Lifetime Purchase" value={runtime.is_lifetime ? 'Yes' : 'No'} />
              <DetailRow label="System Activation" value={subscription.is_activated ? 'Enabled' : 'Disabled'} />
              <DetailRow label="API Key (Linked)" value={subscription.api_key || '-'} mono />
            </Panel>

            <Panel darkMode={darkMode} title="Lifecycle Controls (API-key linked)">
              <div className="space-y-3">
                <textarea
                  value={manageNote}
                  onChange={(e) => setManageNote(e.target.value)}
                  placeholder="Optional admin note for client notification"
                  className={`w-full h-20 rounded-lg p-3 text-sm border ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button disabled={manageLoading} onClick={() => runManageAction('activate')} className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm">Activate</button>
                  <button disabled={manageLoading} onClick={() => runManageAction('deactivate')} className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-sm">Deactivate</button>
                  <button disabled={manageLoading} onClick={() => runManageAction('expire')} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm">Expire Now</button>
                  <button disabled={manageLoading} onClick={() => runManageAction('lifetime')} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm">Lifetime Purchase</button>
                  <button disabled={manageLoading} onClick={() => runManageAction('set_activation', { activated: true })} className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-60 text-white text-sm">Enable App Activation</button>
                  <button disabled={manageLoading} onClick={() => runManageAction('set_activation', { activated: false })} className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white text-sm">Disable App Activation</button>
                </div>

                <div className={`mt-3 p-3 rounded-lg border ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-sm font-semibold mb-2">Manage Subscription Period</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      value={extendDays}
                      onChange={(e) => setExtendDays(Number(e.target.value || 0))}
                      className={`flex-1 rounded-lg p-2 text-sm border ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <button
                      disabled={manageLoading}
                      onClick={() => runManageAction('extend_days', { days: extendDays })}
                      className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm"
                    >
                      Extend Days
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={setEndDate}
                      onChange={(e) => setSetEndDate(e.target.value)}
                      className={`flex-1 rounded-lg p-2 text-sm border ${darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                    <button
                      disabled={manageLoading || !setEndDate}
                      onClick={() => runManageAction('set_end_date', { end_date: setEndDate })}
                      className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm"
                    >
                      Set End Date
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        )}

        {activeTab === 'activity' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Panel darkMode={darkMode} title="Renewal Requests">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {renewals.length === 0 && (
                <div className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>No renewal requests.</div>
              )}
              {renewals.map((renewal) => (
                <div key={renewal.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-semibold">LKR {toCurrency(renewal.amount)}</p>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{renewal.payment_method || 'N/A'} • {renewal.transaction_reference || 'No Ref'}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(renewal.created_at)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${statusBadgeClass(renewal.status)}`}>{renewal.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel darkMode={darkMode} title="Recent Activity">
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recent_activity.length === 0 && (
                <div className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>No recent activity.</div>
              )}
              {recent_activity.map((activity) => (
                <div key={activity.id} className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-semibold capitalize">{activity.event_type.replace(/_/g, ' ')}</p>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Actor: {activity.actor || 'system'} • IP: {activity.ip_address || '-'}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(activity.created_at)}</p>
                    </div>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        )}
      </div>
    </div>
  );
};

const Panel: React.FC<{ darkMode: boolean; title: string; children: React.ReactNode }> = ({ darkMode, title, children }) => (
  <div className={`rounded-2xl p-5 border ${darkMode ? 'bg-gray-800/50 border-purple-500/20' : 'bg-white/80 border-purple-200'}`}>
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    {children}
  </div>
);

const StatCard: React.FC<{ darkMode: boolean; title: string; value: string; icon: React.ReactNode }> = ({ darkMode, title, value, icon }) => (
  <div className={`rounded-xl p-4 border ${darkMode ? 'bg-gray-800/50 border-purple-500/20' : 'bg-white/80 border-purple-200'}`}>
    <div className="flex items-center justify-between mb-2">
      <p className={darkMode ? 'text-gray-300 text-sm' : 'text-gray-700 text-sm'}>{title}</p>
      <div className="text-cyan-400">{icon}</div>
    </div>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

const MiniStat: React.FC<{ darkMode: boolean; label: string; value: string }> = ({ darkMode, label, value }) => (
  <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</p>
    <p className="font-semibold text-sm mt-1">{value}</p>
  </div>
);

const DetailRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = false }) => (
  <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-500/20 last:border-b-0">
    <span className="text-sm text-gray-400">{label}</span>
    <span className={`text-sm font-medium text-right ${mono ? 'font-mono break-all' : ''}`}>{value}</span>
  </div>
);

export default AdminSubscriptionDashboard;
