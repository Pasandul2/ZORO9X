import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Send,
  Save,
  Edit2,
  X,
  Check,
  AlertCircle,
  Calendar,
  User
} from 'lucide-react';
import axios from 'axios';

interface Client {
  id: number;
  client_name: string;
  company_name?: string;
  email: string;
  phone?: string;
  address?: string;
}

interface InvoiceItem {
  description: string;
  payment_method: string;
  price: number;
}

interface Invoice {
  id?: number;
  invoice_number?: string;
  client_id: number;
  invoice_date: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method?: string;
  terms_conditions?: string;
  notes?: string;
  status?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const InvoiceGenerator: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [showInvoiceList, setShowInvoiceList] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Invoice>({
    client_id: 0,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    items: [{ description: '', payment_method: 'One-Time', price: 0 }],
    subtotal: 0,
    discount: 0,
    total_amount: 0,
    payment_method: `Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla`,
    terms_conditions: `• Payment is due within 30 days of invoice date.\n• Late payments may incur additional charges.\n• All services are subject to our standard terms and conditions.\n• Please include invoice number in payment reference.`,
    status: 'draft'
  });

  useEffect(() => {
    fetchClients();
    fetchInvoices();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [formData.items, formData.discount]);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/api/clients?status=active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/api/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.price || 0), 0);
    const total = subtotal - (formData.discount || 0);

    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: total
    }));
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', payment_method: 'One-Time', price: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleClientSelect = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    setFormData({ ...formData, client_id: clientId });
  };

  const handleSave = async (status: string = 'draft') => {
    if (!selectedClient) {
      showMessage('error', 'Please select a client');
      return;
    }

    if (formData.items.length === 0 || formData.items.every(item => !item.description || item.price <= 0)) {
      showMessage('error', 'Please add at least one valid item');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const invoiceData = {
        ...formData,
        status
      };

      const response = await axios.post(`${API_URL}/api/invoices`, invoiceData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        showMessage('success', `Invoice ${status === 'sent' ? 'sent' : 'saved'} successfully!`);
        fetchInvoices();
        if (status === 'sent') {
          setShowInvoiceList(true);
        }
      }
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      showMessage('error', error.response?.data?.message || 'Failed to save invoice');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${formData.invoice_number || 'Draft'}</title>
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
              }
              .no-print { display: none; }
              .print-break { page-break-before: always; }
              .wave-path { fill: white; }
              .wave-path-light { fill: rgba(173, 216, 230, 0.3); }
            </style>
          </head>
          <body>
            ${printRef.current?.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const loadInvoice = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.client_id);
    setSelectedClient(client || null);
    setFormData(invoice);
    setShowInvoiceList(false);
  };

  const createNewInvoice = () => {
    setFormData({
      client_id: 0,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ description: '', payment_method: 'One-Time', price: 0 }],
      subtotal: 0,
      discount: 0,
      total_amount: 0,
      payment_method: `Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla`,
      terms_conditions: `• Payment is due within 30 days of invoice date.\n• Late payments may incur additional charges.\n• All services are subject to our standard terms and conditions.\n• Please include invoice number in payment reference.`,
      status: 'draft'
    });
    setSelectedClient(null);
    setShowInvoiceList(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">Invoice Generator</h1>
          <p className="text-gray-400">Create and manage invoices for your clients</p>
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            {message.text}
          </motion.div>
        )}

        {/* Toggle Buttons */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setShowInvoiceList(true)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              showInvoiceList
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Invoice List
          </button>
          <button
            onClick={createNewInvoice}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              !showInvoiceList
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Create New Invoice
          </button>
        </div>

        {showInvoiceList ? (
          /* Invoice List */
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Invoices</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4">Invoice #</th>
                    <th className="text-left py-3 px-4">Client</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Due Date</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="py-3 px-4">{invoice.invoice_number}</td>
                      <td className="py-3 px-4">
                        {clients.find(c => c.id === invoice.client_id)?.client_name || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{new Date(invoice.due_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">${parseFloat(invoice.total_amount || '0').toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                          invoice.status === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => loadInvoice(invoice)}
                          className="text-blue-400 hover:text-blue-300 mr-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Invoice Form */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Panel */}
            <div className="lg:col-span-1 space-y-6">
              {/* Client Selection */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Client</label>
                    <select
                      value={formData.client_id || ''}
                      onChange={(e) => handleClientSelect(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a client...</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.client_name} {client.company_name ? `(${client.company_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClient && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h4 className="font-medium mb-2">{selectedClient.client_name}</h4>
                      {selectedClient.company_name && (
                        <p className="text-sm text-gray-400">{selectedClient.company_name}</p>
                      )}
                      <p className="text-sm text-gray-400">{selectedClient.email}</p>
                      {selectedClient.phone && (
                        <p className="text-sm text-gray-400">{selectedClient.phone}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Details */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Invoice Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Invoice Number</label>
                    <input
                      type="text"
                      value={formData.invoice_number || ''}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="Auto-generated if empty"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Invoice Date</label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Due Date</label>
                    <input
                      type="date"
                      value={formData.due_date || ''}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleSave('draft')}
                    className="w-full bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </button>
                  <button
                    onClick={() => handleSave('sent')}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Send Invoice
                  </button>
                  <button
                    onClick={handlePrint}
                    className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Print/Download PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice Items
                </h3>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="w-32">
                        <label className="block text-sm font-medium mb-2">Payment Type</label>
                        <select
                          value={item.payment_method}
                          onChange={(e) => updateItem(index, 'payment_method', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="One-Time">One-Time</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </div>

                      <div className="w-32">
                        <label className="block text-sm font-medium mb-2">Price ($)</label>
                        <input
                          type="number"
                          value={item.price || ''}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {/* Totals */}
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${(formData.subtotal || 0).toFixed(2)}</span>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Discount ($)</label>
                        <input
                          type="number"
                          value={formData.discount || ''}
                          onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-lg font-semibold pt-3 border-t border-gray-600">
                      <span>Total:</span>
                      <span>${(formData.total_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Fields */}
              <div className="bg-gray-800 rounded-lg p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <textarea
                    value={formData.payment_method || ''}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
                  <textarea
                    value={formData.terms_conditions || ''}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Document */}
        <div ref={printRef} className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden print:shadow-none">
          {/* Header */}
          <div className="print:break-inside-avoid">
            <img src="/Logo/PDFheader.PNG" alt="Header" className="w-full h-auto" />
          </div>

          {/* Main Content */}
          <div className="p-8 print:p-6">
            {/* Invoice Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-blue-700 mb-2">INVOICE</h1>
              <div className="text-gray-600">
                <p className="font-semibold">INVOICE NO : {formData.invoice_number || 'DRAFT'}</p>
              </div>
            </div>

            {/* Client and Date Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="font-semibold text-gray-700 mb-2">
                  INVOICE TO :
                  <span className="text-blue-700 ml-2 print:hidden">
                    {selectedClient?.client_name || 'Select a client'}
                  </span>
                  <span className="text-blue-700 ml-2 hidden print:inline">
                    {selectedClient?.client_name}
                  </span>
                </p>
                {selectedClient && (
                  <>
                    {selectedClient.company_name && (
                      <p className="text-gray-600">{selectedClient.company_name}</p>
                    )}
                    <p className="text-gray-600">{selectedClient.email}</p>
                    {selectedClient.phone && (
                      <p className="text-gray-600">{selectedClient.phone}</p>
                    )}
                    {selectedClient.address && (
                      <p className="text-gray-600">{selectedClient.address}</p>
                    )}
                  </>
                )}
              </div>

              <div className="text-right">
                <p className="font-semibold text-gray-700 mb-2">Invoice Details</p>
                <p className="text-gray-600">
                  <span className="font-medium">Date:</span> {new Date(formData.invoice_date).toLocaleDateString()}
                </p>
                {formData.due_date && (
                  <p className="text-gray-600">
                    <span className="font-medium">Due Date:</span> {new Date(formData.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Payment Type</th>
                    <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{item.description || '-'}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.payment_method}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right">${item.price?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span className="font-semibold">Subtotal:</span>
                  <span>${formData.subtotal?.toFixed(2)}</span>
                </div>
                {formData.discount > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-300">
                    <span className="font-semibold">Discount:</span>
                    <span>-${formData.discount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-gray-400">
                  <span>Total:</span>
                  <span>${formData.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            {formData.payment_method && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-2">Payment Method</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-gray-600 whitespace-pre-wrap font-sans">{formData.payment_method}</pre>
                </div>
              </div>
            )}

            {/* Terms & Conditions */}
            {formData.terms_conditions && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-2">Terms & Conditions</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-gray-600 whitespace-pre-wrap font-sans">{formData.terms_conditions}</pre>
                </div>
              </div>
            )}

            {/* Notes */}
            {formData.notes && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-gray-600 whitespace-pre-wrap font-sans">{formData.notes}</pre>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="print:break-inside-avoid">
              <img src="/Logo/PDFfooter.PNG" alt="Footer" className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGenerator;