import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Phone,
  Search,
  MapPin,
  Clock3,
  Target,
  UserCheck,
  UserX,
  Filter,
  X,
  Image as ImageIcon,
  Save,
  Star
} from 'lucide-react';
import { fetchLeads, createLead, updateLead, deleteLead } from '../services/leads';
import ConfirmDialog from '../components/ConfirmDialog';

interface Lead {
  id: number;
  shop_name: string;
  location?: string;
  country_code?: string;
  contact_number?: string;
  status: LeadStatus;
  priority?: LeadPriority;
  is_starred?: number | boolean;
  notes?: string;
  special_note?: string;
  image?: string;
  next_follow_up_date?: string | null;
  contact_attempts?: number;
  last_contact_at?: string | null;
  created_at: string;
}

type LeadStatus =
  | 'contact only'
  | 'interested'
  | 'confirmed'
  | 'declined'
  | 'callback scheduled'
  | 'rejected - call after 7 days';

type LeadPriority = 'low' | 'medium' | 'high';

const statusOptions: LeadStatus[] = [
  'contact only',
  'interested',
  'confirmed',
  'declined',
  'callback scheduled'
];

const priorityOptions: LeadPriority[] = ['low', 'medium', 'high'];

const countryCodes = ['+94', '+91', '+1', '+44', '+61', '+971', '+65'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const statusChipClasses = (status: LeadStatus) => {
  if (status === 'confirmed') return 'bg-green-900/30 text-green-300 border border-green-700';
  if (status === 'interested') return 'bg-pink-900/30 text-pink-300 border border-pink-700';
  if (status === 'callback scheduled' || status === 'rejected - call after 7 days') return 'bg-amber-900/30 text-amber-300 border border-amber-700';
  if (status === 'declined') return 'bg-red-900/30 text-red-300 border border-red-700';
  return 'bg-blue-900/30 text-blue-300 border border-blue-700';
};

const rowTintClasses = (status: LeadStatus) => {
  if (status === 'confirmed') return 'bg-green-950/20 hover:bg-green-950/35';
  if (status === 'interested') return 'bg-pink-950/20 hover:bg-pink-950/35';
  if (status === 'callback scheduled' || status === 'rejected - call after 7 days') return 'bg-amber-950/15 hover:bg-amber-950/25';
  return 'hover:bg-gray-800/50';
};

const LeadsManager: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'warning' | 'danger' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Yes',
    cancelText: 'No',
    type: 'warning',
    onConfirm: () => undefined,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState('');
  const [followUpWindow, setFollowUpWindow] = useState<string>('all');
  const [starFilter, setStarFilter] = useState<string>('all');

  const [form, setForm] = useState({
    shop_name: '',
    location: '',
    country_code: '+94',
    contact_number: '',
    status: 'contact only' as LeadStatus,
    priority: 'medium' as LeadPriority,
    is_starred: false,
    notes: '',
    special_note: '',
    next_follow_up_date: todayISO(),
    contact_attempts: 0,
    last_contact_at: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  const buildFilters = () => {
    const filters: Record<string, string> = {};
    if (searchTerm) filters.search = searchTerm;
    if (filterStatus !== 'all') filters.status = filterStatus;
    if (filterPriority !== 'all') filters.priority = filterPriority;
    if (filterLocation) filters.location = filterLocation;
    if (followUpWindow !== 'all') filters.followUp = followUpWindow;
    if (starFilter === 'starred') filters.starred = '1';
    return filters;
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await fetchLeads(buildFilters());
      if (response.success) {
        setLeads(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (notificationPermission !== 'granted') {
      return;
    }

    const dueLeads = leads.filter((lead) => {
      if (!lead.next_follow_up_date) return false;
      const followUp = new Date(lead.next_follow_up_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      followUp.setHours(0, 0, 0, 0);
      return followUp.getTime() <= today.getTime() && lead.status !== 'confirmed';
    });

    if (dueLeads.length > 0) {
      const storageKey = `lead-followup-notified-${dueLeads.map((lead) => lead.id).join('-')}`;
      if (!sessionStorage.getItem(storageKey)) {
        sessionStorage.setItem(storageKey, '1');
        new Notification('Lead follow-up reminder', {
          body: `${dueLeads.length} lead${dueLeads.length > 1 ? 's' : ''} need follow-up today or are overdue.`,
          icon: '/vite.svg',
        });
      }
    }
  }, [leads, notificationPermission]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadLeads();
    }, 250);
    return () => clearTimeout(t);
  }, [searchTerm, filterStatus, filterPriority, filterLocation, followUpWindow, starFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const confirmed = leads.filter((lead) => lead.status === 'confirmed').length;
    const interested = leads.filter((lead) => lead.status === 'interested').length;
    const callbacks = leads.filter((lead) => lead.status === 'callback scheduled' || lead.status === 'rejected - call after 7 days').length;
    const starred = leads.filter((lead) => Boolean(lead.is_starred)).length;
    return { total, confirmed, interested, callbacks, starred };
  }, [leads]);

  const openCreate = () => {
    setEditingLead(null);
    setForm({
      shop_name: '',
      location: '',
      country_code: '+94',
      contact_number: '',
      status: 'contact only',
      priority: 'medium',
      is_starred: false,
      notes: '',
      special_note: '',
      next_follow_up_date: todayISO(),
      contact_attempts: 0,
      last_contact_at: ''
    });
    setImageFile(null);
    setShowModal(true);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }

    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setForm({
      shop_name: lead.shop_name || '',
      location: lead.location || '',
      country_code: lead.country_code || '+94',
      contact_number: lead.contact_number || '',
      status: lead.status || 'contact only',
      priority: lead.priority || 'medium',
      is_starred: Boolean(lead.is_starred),
      notes: lead.notes || '',
      special_note: lead.special_note || '',
      next_follow_up_date: lead.next_follow_up_date ? lead.next_follow_up_date.slice(0, 10) : todayISO(),
      contact_attempts: lead.contact_attempts || 0,
      last_contact_at: lead.last_contact_at ? lead.last_contact_at.slice(0, 16) : ''
    });
    setImageFile(null);
    setShowModal(true);
  };

  const saveLead = async (event: React.FormEvent) => {
    event.preventDefault();

    const fd = new FormData();
    fd.append('shop_name', form.shop_name);
    fd.append('location', form.location);
    fd.append('country_code', form.country_code);
    fd.append('contact_number', form.contact_number);
    fd.append('status', form.status);
    fd.append('priority', form.priority);
    fd.append('is_starred', form.is_starred ? 'true' : 'false');
    fd.append('notes', form.notes);
    fd.append('special_note', form.special_note);
    fd.append('contact_attempts', String(form.contact_attempts));
    fd.append('next_follow_up_date', form.next_follow_up_date || todayISO());
    if (form.last_contact_at) fd.append('last_contact_at', form.last_contact_at.replace('T', ' '));
    if (imageFile) fd.append('image', imageFile);

    try {
      if (editingLead) {
        await updateLead(editingLead.id, fd);
      } else {
        await createLead(fd);
      }
      setShowModal(false);
      await loadLeads();
    } catch (error) {
      console.error('Failed to save lead:', error);
    }
  };

  const removeLead = async (id: number) => {
    try {
      await deleteLead(id);
      await loadLeads();
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  const askConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'warning' | 'danger' | 'info' = 'warning',
    confirmText = 'Yes',
    cancelText = 'No'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm: () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
    });
  };

  const quickStatus = async (lead: Lead, status: LeadStatus) => {
    const fd = new FormData();
    fd.append('status', status);
    if (status === 'callback scheduled') {
      fd.append('next_follow_up_date', lead.next_follow_up_date ? lead.next_follow_up_date.slice(0, 10) : todayISO());
    }
    try {
      await updateLead(lead.id, fd);
      await loadLeads();
    } catch (error) {
      console.error('Failed quick update:', error);
    }
  };

  const toggleStar = async (lead: Lead) => {
    const fd = new FormData();
    fd.append('is_starred', Boolean(lead.is_starred) ? 'false' : 'true');
    try {
      await updateLead(lead.id, fd);
      await loadLeads();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const whatsAppLink = (countryCode?: string, phone?: string, shop?: string) => {
    if (!phone) return '#';
    const cc = (countryCode || '+94').replace(/[^0-9]/g, '');
    const clean = phone.replace(/[^0-9]/g, '');
    const text = `Hello, following up about ${shop || 'your business'}.`;
    return `https://wa.me/${cc}${clean}?text=${encodeURIComponent(text)}`;
  };

  const dueTodayCount = leads.filter((lead) => {
    if (!lead.next_follow_up_date) return false;
    const followUp = new Date(lead.next_follow_up_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    followUp.setHours(0, 0, 0, 0);
    return followUp.getTime() <= today.getTime() && lead.status !== 'confirmed';
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <MapPin className="w-8 h-8 text-blue-400" />
            Lead Management
          </h1>
          <p className="text-gray-400 mt-1">Custom follow-up workflow with starred leads and country code dialing</p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-medium"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-xl shadow-blue-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-blue-200 text-sm">Total</p><h3 className="text-4xl font-bold text-white mt-2">{stats.total}</h3></div>
            <Target className="w-10 h-10 text-blue-100" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-2xl p-6 shadow-xl shadow-yellow-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-yellow-200 text-sm">Starred</p><h3 className="text-4xl font-bold text-white mt-2">{stats.starred}</h3></div>
            <Star className="w-10 h-10 text-yellow-100" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-xl shadow-green-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-green-200 text-sm">Confirmed</p><h3 className="text-4xl font-bold text-white mt-2">{stats.confirmed}</h3></div>
            <UserCheck className="w-10 h-10 text-green-100" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-pink-600 to-pink-800 rounded-2xl p-6 shadow-xl shadow-pink-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-pink-200 text-sm">Interested</p><h3 className="text-4xl font-bold text-white mt-2">{stats.interested}</h3></div>
            <Filter className="w-10 h-10 text-pink-100" />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-6 shadow-xl shadow-amber-900/30">
          <div className="flex items-center justify-between">
            <div><p className="text-amber-200 text-sm">Callback</p><h3 className="text-4xl font-bold text-white mt-2">{stats.callbacks}</h3></div>
            <Clock3 className="w-10 h-10 text-amber-100" />
          </div>
        </motion.div>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-300">
            Follow-up notifications: <span className="text-white font-semibold">{dueTodayCount}</span> due now
          </div>
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm"
          >
            {notificationPermission === 'granted'
              ? 'Notifications Enabled'
              : notificationPermission === 'unsupported'
              ? 'Notifications Unsupported'
              : 'Enable Web Notifications'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by shop, number, notes"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400"
            />
          </div>

          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white">
            <option value="all">All Status</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>

          <select value={filterPriority} onChange={(event) => setFilterPriority(event.target.value)} className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white">
            <option value="all">All Priority</option>
            {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>

          <select value={starFilter} onChange={(event) => setStarFilter(event.target.value)} className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white">
            <option value="all">All Leads</option>
            <option value="starred">Starred Only</option>
          </select>

          <input
            value={filterLocation}
            onChange={(event) => setFilterLocation(event.target.value)}
            placeholder="Location"
            className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white"
          />

          <select value={followUpWindow} onChange={(event) => setFollowUpWindow(event.target.value)} className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white">
            <option value="all">All Follow-up</option>
            <option value="today">Today</option>
            <option value="overdue">Overdue</option>
            <option value="week">Next 7 Days</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-blue-900/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20"><UserX className="w-14 h-14 text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No leads found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/80 border-b border-blue-900/30">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Shop</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Special Note</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Follow-up</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Star</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {leads.map((lead, index) => (
                  <motion.tr key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className={`transition-colors ${rowTintClasses(lead.status)}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleStar(lead)} className={`p-1 rounded ${Boolean(lead.is_starred) ? 'text-yellow-300' : 'text-gray-500 hover:text-yellow-300'}`} title="Toggle Star">
                          <Star className={`w-4 h-4 ${Boolean(lead.is_starred) ? 'fill-current' : ''}`} />
                        </button>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {lead.shop_name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{lead.shop_name}</div>
                          <div className="text-xs text-gray-400 uppercase">{lead.priority || 'medium'} priority</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{lead.location || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{lead.country_code || '+94'} {lead.contact_number || '-'}</td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusChipClasses(lead.status)}`}>{lead.status}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-[260px]">
                      <span className="block truncate" title={lead.special_note || ''}>{lead.special_note || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{lead.next_follow_up_date ? new Date(lead.next_follow_up_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <button onClick={() => askConfirm(
                        Boolean(lead.is_starred) ? 'Remove star?' : 'Mark as starred?',
                        Boolean(lead.is_starred)
                          ? `Remove star from ${lead.shop_name}?`
                          : `Mark ${lead.shop_name} as starred?`,
                        () => toggleStar(lead),
                        'info',
                        'Yes',
                        'No'
                      )} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${Boolean(lead.is_starred) ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>
                        <Star className={`w-3.5 h-3.5 ${Boolean(lead.is_starred) ? 'fill-current' : ''}`} />
                        {Boolean(lead.is_starred) ? 'Starred' : 'Not Starred'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => openEdit(lead)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg" title="Edit"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => askConfirm('Delete lead?', `Delete ${lead.shop_name}? This cannot be undone.`, () => removeLead(lead.id), 'danger', 'Delete', 'Cancel')} className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        <a href={whatsAppLink(lead.country_code, lead.contact_number, lead.shop_name)} target="_blank" rel="noreferrer" className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-lg" title="WhatsApp"><Phone className="w-4 h-4" /></a>
                        <button onClick={() => askConfirm('Mark confirmed?', `Set ${lead.shop_name} as confirmed?`, () => quickStatus(lead, 'confirmed'), 'info', 'Yes', 'No')} className="px-3 py-2 text-xs rounded-lg bg-green-700 hover:bg-green-600 text-white">Confirm</button>
                        <button onClick={() => askConfirm('Mark interested?', `Set ${lead.shop_name} as interested?`, () => quickStatus(lead, 'interested'), 'info', 'Yes', 'No')} className="px-3 py-2 text-xs rounded-lg bg-pink-700 hover:bg-pink-600 text-white">Interested</button>
                        <button onClick={() => askConfirm('Schedule callback?', `Mark ${lead.shop_name} for callback follow-up?`, () => quickStatus(lead, 'callback scheduled'), 'warning', 'Yes', 'No')} className="px-3 py-2 text-xs rounded-lg bg-amber-700 hover:bg-amber-600 text-white">Callback</button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-3xl rounded-2xl border border-blue-900/30 bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-900/30">
              <div>
                <h3 className="text-xl font-semibold">{editingLead ? 'Edit Lead' : 'Create New Lead'}</h3>
                <p className="text-xs text-gray-400 mt-1">Default follow-up date is today. You can customize any date.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={saveLead} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Shop Name</label>
                  <input required value={form.shop_name} onChange={(event) => setForm((prev) => ({ ...prev, shop_name: event.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" placeholder="Enter shop/business name" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Location</label>
                  <input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" placeholder="Area, town, district" />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Mobile Number</label>
                  <div className="flex gap-2">
                    <select value={form.country_code} onChange={(event) => setForm((prev) => ({ ...prev, country_code: event.target.value }))} className="w-28 px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white">
                      {countryCodes.map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>
                    <input value={form.contact_number} onChange={(event) => setForm((prev) => ({ ...prev, contact_number: event.target.value.replace(/[^0-9]/g, '') }))} className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" placeholder="771234567" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Priority</label>
                  <select value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as LeadPriority }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white">
                    {priorityOptions.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Status</label>
                  <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as LeadStatus }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white">
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Follow-up Date</label>
                  <input type="date" value={form.next_follow_up_date} onChange={(event) => setForm((prev) => ({ ...prev, next_follow_up_date: event.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Contact Attempts</label>
                  <input type="number" min={0} value={form.contact_attempts} onChange={(event) => setForm((prev) => ({ ...prev, contact_attempts: Number(event.target.value) }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Last Contact Time</label>
                  <input type="datetime-local" value={form.last_contact_at} onChange={(event) => setForm((prev) => ({ ...prev, last_contact_at: event.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Public Notes</label>
                <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" rows={3} placeholder="Team-visible notes" />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Special Private Note (Hidden in table)</label>
                <textarea value={form.special_note} onChange={(event) => setForm((prev) => ({ ...prev, special_note: event.target.value }))} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white" rows={3} placeholder="Private internal note" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Lead Image</label>
                  <div className="flex items-center gap-3">
                    <label className="px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm cursor-pointer hover:bg-gray-700 inline-flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" /> Upload Image
                      <input type="file" accept="image/*" className="hidden" onChange={(event) => setImageFile(event.target.files && event.target.files[0] ? event.target.files[0] : null)} />
                    </label>
                    <span className="text-xs text-gray-400">{imageFile ? imageFile.name : 'No file selected'}</span>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <button type="button" onClick={() => setForm((prev) => ({ ...prev, is_starred: !prev.is_starred }))} className={`w-full px-4 py-3 rounded-xl ${form.is_starred ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'} text-white inline-flex items-center justify-center gap-2`}>
                    <Star className={`w-4 h-4 ${form.is_starred ? 'fill-current' : ''}`} /> {form.is_starred ? 'Starred' : 'Mark Starred'}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white">Cancel</button>
                <button type="submit" className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-2"><Save className="w-4 h-4" /> Save Lead</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
      />
    </div>
  );
};

export default LeadsManager;
