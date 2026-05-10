import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Lock, User, Mail, Globe, Receipt } from 'lucide-react';

const Settings: React.FC = () => {
  const [bank, setBank] = useState({ bank_name: '', account_no: '', account_name: '', branch: '', swift: '', instructions: '' });
  const [loadingBank, setLoadingBank] = useState(false);

  useEffect(() => {
    const fetchBank = async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      setLoadingBank(true);
      try {
        const base = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${base}/api/admin/bank-details`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data && data.bank_details) setBank((prev) => ({ ...prev, ...data.bank_details }));
      } catch (err) {
        console.error('Failed to load bank details', err);
      } finally {
        setLoadingBank(false);
      }
    };
    fetchBank();
  }, []);

  const saveBank = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) return alert('Admin token missing.');
    try {
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/admin/bank-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(bank),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Save failed');
      alert('Bank details saved.');
    } catch (err) {
      console.error(err);
      alert('Failed to save bank details');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-blue-400" />
          Settings
        </h1>
        <p className="text-gray-400 mt-1">Configure your admin panel preferences</p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">General Settings</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Site Name</p>
                <p className="text-sm text-gray-400">ZORO9X Admin Portal</p>
              </div>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                Edit
              </button>
            </div>
          </div>
        </motion.div>

        {/* Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-bold text-white">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-sm text-gray-400">Receive email updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-6 h-6 text-red-400" />
            <h3 className="text-xl font-bold text-white">Security</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-gray-400">Add an extra layer of security</p>
              </div>
              <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors">
                Enable
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bank Details for Renewals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Bank Details (Renewal)</h3>
          </div>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Bank Name</p>
                <input value={bank.bank_name} onChange={(e) => setBank((b) => ({ ...b, bank_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Number</p>
                <input value={bank.account_no} onChange={(e) => setBank((b) => ({ ...b, account_no: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Account Name</p>
                <input value={bank.account_name} onChange={(e) => setBank((b) => ({ ...b, account_name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Branch / IFSC</p>
                <input value={bank.branch} onChange={(e) => setBank((b) => ({ ...b, branch: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white" />
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-400">Instructions shown to clients</p>
                <textarea value={bank.instructions} onChange={(e) => setBank((b) => ({ ...b, instructions: e.target.value }))} rows={4} className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white" />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button onClick={saveBank} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg">Save Bank Details</button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
