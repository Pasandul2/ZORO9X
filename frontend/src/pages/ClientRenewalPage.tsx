import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Receipt, CheckCircle2, Clock3, XCircle } from 'lucide-react';

interface ClientRenewalPageProps {
  darkMode: boolean;
}

interface SubscriptionItem {
  id: number;
  system_name: string;
  plan_name: string;
  status: string;
  end_date: string;
  price?: number;
  billing_cycle?: string;
  days_remaining?: number | null;
}

interface RenewalRequest {
  id: number;
  amount: number;
  receipt_url?: string | null;
  transaction_reference?: string | null;
  notes?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  payment_period_start?: string;
  payment_period_end?: string;
}

interface BankDetails {
  account_no: string;
  account_name: string;
  bank_name: string;
}

const statusBadgeClass = (status: string) => {
  if (status === 'approved') {
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  }
  if (status === 'rejected') {
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
  if (status === 'pending') {
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  }
  return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

const ClientRenewalPage: React.FC<ClientRenewalPageProps> = ({ darkMode }) => {
  const navigate = useNavigate();
  const { subscriptionId } = useParams<{ subscriptionId: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionItem | null>(null);
  const [requests, setRequests] = useState<RenewalRequest[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [form, setForm] = useState({
    transaction_reference: '',
    notes: '',
    receipt: null as File | null,
  });

  const token = localStorage.getItem('token');

  const selectedReceiptName = useMemo(() => form.receipt?.name || '', [form.receipt]);

  const fetchAll = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (!subscriptionId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [subsRes, reqRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/saas/my-subscriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/renew-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (subsRes.status === 401 || subsRes.status === 403 || reqRes.status === 401 || reqRes.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }

      if (subsRes.ok) {
        const subsData = await subsRes.json();
        const list: SubscriptionItem[] = Array.isArray(subsData.subscriptions) ? subsData.subscriptions : [];
        const target = list.find((item) => String(item.id) === String(subscriptionId)) || null;
        setSubscription(target);
        setBankDetails(subsData.bank_details || null);
      }

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(Array.isArray(reqData.requests) ? reqData.requests : []);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error loading renewal page data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [subscriptionId]);

  const handleSubmitRenewal = async () => {
    if (!token || !subscriptionId) return;

    if (!form.receipt) {
      alert('Please upload your bank transfer receipt.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('receipt', form.receipt);
      payload.append('transaction_reference', form.transaction_reference.trim());
      payload.append('notes', form.notes.trim());

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/saas/subscriptions/${subscriptionId}/renew-request`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: payload,
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(data?.message || 'Failed to submit renewal request');
        return;
      }

      alert(data?.message || 'Renewal request submitted successfully');
      setForm({ transaction_reference: '', notes: '', receipt: null });
      await fetchAll();
    } catch (error) {
      console.error('Error submitting renewal request:', error);
      alert('Failed to submit renewal request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 flex items-center justify-center ${
        darkMode ? 'bg-black text-white' : 'bg-white text-black'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className={`min-h-screen pt-32 pb-20 px-4 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('/client-dashboard')}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h1 className="text-2xl font-bold mb-2">Subscription Not Found</h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              The selected subscription could not be loaded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pt-32 pb-20 px-4 ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate('/client-dashboard')}
            className="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h1 className="text-3xl font-bold">Renewal & Payment Verification</h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {subscription.system_name} • {subscription.plan_name}
            </p>
            <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
              <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-gray-400">Status</p>
                <p className="font-semibold capitalize">{subscription.status}</p>
              </div>
              <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-gray-400">Ends On</p>
                <p className="font-semibold">{new Date(subscription.end_date).toLocaleDateString()}</p>
              </div>
              <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-gray-400">Days Remaining</p>
                <p className="font-semibold">{subscription.days_remaining ?? '-'}</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-400" /> Bank Transfer Details
          </h2>

          <div className="grid md:grid-cols-3 gap-3 text-sm mb-5">
            <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-gray-400">Bank</p>
              <p className="font-semibold">{bankDetails?.bank_name || 'HNB'}</p>
            </div>
            <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-gray-400">Account Number</p>
              <p className="font-semibold">{bankDetails?.account_no || '2002342027'}</p>
            </div>
            <div className={`rounded-lg p-3 border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-gray-400">Account Name</p>
              <p className="font-semibold">{bankDetails?.account_name || 'Pamith Pasandul'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Transaction Reference (Optional)</label>
              <input
                type="text"
                value={form.transaction_reference}
                onChange={(e) => setForm((prev) => ({ ...prev, transaction_reference: e.target.value }))}
                placeholder="Bank reference number"
                className={`w-full px-4 py-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Receipt Upload (Required)</label>
              <label className={`w-full px-4 py-3 rounded-lg border cursor-pointer inline-flex items-center gap-2 ${
                darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
              }`}>
                <Upload className="w-4 h-4" />
                <span>{selectedReceiptName || 'Choose JPG, PNG, WEBP or PDF'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setForm((prev) => ({ ...prev, receipt: e.target.files?.[0] || null }))}
                />
              </label>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Note (Optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any note for admin review"
              rows={3}
              className={`w-full px-4 py-3 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-300'}`}
            />
          </div>

          <button
            onClick={handleSubmitRenewal}
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-70 text-white px-5 py-3 rounded-lg font-semibold"
          >
            {submitting ? 'Submitting Renewal...' : 'Submit Renewal Request'}
          </button>
        </div>

        <div className={`rounded-2xl p-6 border ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-xl font-bold mb-4">Recent Renewal Requests</h2>

          {requests.length === 0 ? (
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No renewal requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">LKR {Number(request.amount || 0).toFixed(2)}</p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Submitted: {formatDateTime(request.created_at)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border capitalize ${statusBadgeClass(request.status)}`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-3 grid md:grid-cols-2 gap-2 text-sm">
                    <p><span className="text-gray-400">Reference:</span> {request.transaction_reference || '-'}</p>
                    <p><span className="text-gray-400">Reviewed:</span> {formatDateTime(request.reviewed_at)}</p>
                  </div>

                  {request.payment_period_start && request.payment_period_end && (
                    <p className="text-sm mt-2 text-cyan-400">
                      Coverage: {new Date(request.payment_period_start).toLocaleDateString()} - {new Date(request.payment_period_end).toLocaleDateString()}
                    </p>
                  )}

                  {request.notes && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Note: {request.notes}
                    </p>
                  )}

                  {request.admin_note && (
                    <p className={`text-sm mt-1 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                      Admin note: {request.admin_note}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {request.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                    {request.status === 'pending' && <Clock3 className="w-4 h-4 text-yellow-400" />}
                    {request.status === 'rejected' && <XCircle className="w-4 h-4 text-red-400" />}
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {request.status === 'approved'
                        ? 'Approved requests activate immediately after next online validation.'
                        : request.status === 'pending'
                        ? 'Awaiting admin review.'
                        : 'Rejected. Please submit a new request with valid receipt details.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientRenewalPage;
