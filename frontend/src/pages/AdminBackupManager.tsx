import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Archive, Download, Search, Filter, RefreshCw, HardDrive, Lock, Unlock } from 'lucide-react';
import axios from 'axios';

interface ClientBackup {
  id: number;
  subscription_id: number;
  client_id: number;
  backup_name: string;
  original_name: string;
  file_size: number;
  source: string;
  is_encrypted: boolean;
  encryption_method: string | null;
  created_at: string;
  uploaded_at: string;
  subdomain: string;
  client_email: string;
  client_company: string;
  system_name: string;
  download_url: string;
}

interface AdminBackupManagerProps {
  darkMode: boolean;
}

const AdminBackupManager: React.FC<AdminBackupManagerProps> = ({ darkMode }) => {
  const [backups, setBackups] = useState<ClientBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterSubscription, setFilterSubscription] = useState('');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

  useEffect(() => {
    fetchBackups();
  }, [filterClient, filterSubscription, pagination.offset]);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString(),
      });

      if (filterClient) params.append('client_id', filterClient);
      if (filterSubscription) params.append('subscription_id', filterSubscription);

      const response = await axios.get(`/api/saas/admin/backups?${params.toString()}`);

      if (response.data.success) {
        setBackups(response.data.backups);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load backups');
      console.error('Error fetching backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (backup: ClientBackup) => {
    try {
      const response = await axios.get(backup.download_url, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.backup_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download backup');
      console.error('Error downloading backup:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredBackups = backups.filter((backup) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      backup.backup_name.toLowerCase().includes(searchLower) ||
      backup.client_email.toLowerCase().includes(searchLower) ||
      backup.client_company.toLowerCase().includes(searchLower) ||
      backup.system_name.toLowerCase().includes(searchLower) ||
      backup.subdomain.toLowerCase().includes(searchLower)
    );
  });

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit),
      }));
    }
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination((prev) => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Archive className="w-10 h-10 text-purple-500" />
            Client Backup Management
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            View and download all client backups across all subscriptions
          </p>
        </motion.div>

        {/* Filters and Search */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-2xl border p-6 mb-6 ${
            darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          }`}
        >
          <div className="grid md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search backups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by Client ID"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by Subscription ID"
                value={filterSubscription}
                onChange={(e) => setFilterSubscription(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <button
              onClick={fetchBackups}
              className="px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Total: {pagination.total} backups
            </span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Showing: {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)}
            </span>
          </div>
        </motion.div>

        {/* Backups List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border ${
            darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
          }`}
        >
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                {error}
              </div>
            </div>
          ) : filteredBackups.length === 0 ? (
            <div className={`p-12 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <HardDrive className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No backups found</p>
              <p className="text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700/30">
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">System</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Backup</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Security</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className={darkMode ? 'divide-y divide-gray-700/30 bg-gray-900' : 'divide-y divide-gray-200 bg-white'}>
                  {filteredBackups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-sm">{backup.client_company || backup.client_email}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {backup.subdomain} (ID: {backup.client_id})
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium">{backup.system_name}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Sub ID: {backup.subscription_id}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-sm">{backup.backup_name}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {backup.original_name || 'Database backup'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {new Date(backup.uploaded_at || backup.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm">{formatFileSize(backup.file_size)}</td>
                      <td className="px-4 py-4">
                        <span className="capitalize text-sm px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                          {backup.source}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {backup.is_encrypted ? (
                          <div className="flex items-center gap-2 text-green-400 text-sm">
                            <Lock className="w-4 h-4" />
                            <span>{backup.encryption_method}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Unlock className="w-4 h-4" />
                            <span>Not encrypted</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDownload(backup)}
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

          {/* Pagination */}
          {!loading && !error && filteredBackups.length > 0 && (
            <div className={`px-6 py-4 border-t flex items-center justify-between ${
              darkMode ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <button
                onClick={handlePrevPage}
                disabled={pagination.offset === 0}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  pagination.offset === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-800'
                } ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}`}
              >
                Previous
              </button>

              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                {Math.ceil(pagination.total / pagination.limit)}
              </span>

              <button
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  !pagination.hasMore
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-800'
                } ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-900'}`}
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminBackupManager;
