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

interface QuotationItem {
  description: string;
  payment_method: string;
  price: number;
}

interface Quotation {
  id?: number;
  quotation_number?: string;
  client_id: number;
  quotation_date: string;
  valid_until?: string;
  items: QuotationItem[];
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method?: string;
  terms_conditions?: string;
  notes?: string;
  status?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const QuotationGenerator: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [showQuotationList, setShowQuotationList] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Quotation>({
    client_id: 0,
    quotation_date: new Date().toISOString().split('T')[0],
    items: [{ description: '', payment_method: 'One-Time', price: 0 }],
    subtotal: 0,
    discount: 0,
    total_amount: 0,
    payment_method: `Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla`,
    terms_conditions: `• From this date, domains and hosting charges will be paid every year. A 95% advance required to start the project. Remaining balance upon completion.\n• Issues related to domains and hosting beyond the initial scope may be charged.\n• Negligence features or revisions beyond the initial scope may incur charges.\n• If the project is sold to any third party members.`,
    status: 'draft'
  });

  useEffect(() => {
    fetchClients();
    fetchQuotations();
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

  const fetchQuotations = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/api/quotations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setQuotations(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
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

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
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

    if (formData.items.length === 0 || !formData.items[0].description) {
      showMessage('error', 'Please add at least one item');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const dataToSend = { ...formData, status };

      if (formData.id) {
        // Update existing quotation
        const response = await axios.put(
          `${API_URL}/api/quotations/${formData.id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          showMessage('success', 'Quotation updated successfully');
          fetchQuotations();
        }
      } else {
        // Create new quotation
        const response = await axios.post(
          `${API_URL}/api/quotations`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success) {
          showMessage('success', 'Quotation created successfully');
          setFormData({
            ...formData,
            id: response.data.data.id,
            quotation_number: response.data.data.quotation_number,
            status
          });
          fetchQuotations();
        }
      }
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      showMessage('error', error.response?.data?.message || 'Failed to save quotation');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const loadQuotation = async (id: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/api/quotations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const quotation = response.data.data;
        setFormData({
          ...quotation,
          items: JSON.parse(quotation.items)
        });
        
        const client = clients.find(c => c.id === quotation.client_id);
        setSelectedClient(client || null);
        setShowQuotationList(false);
      }
    } catch (error) {
      console.error('Error loading quotation:', error);
      showMessage('error', 'Failed to load quotation');
    }
  };

  const createNew = () => {
    setFormData({
      client_id: 0,
      quotation_date: new Date().toISOString().split('T')[0],
      items: [{ description: '', payment_method: 'One-Time', price: 0 }],
      subtotal: 0,
      discount: 0,
      total_amount: 0,
      payment_method: `Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla`,
      terms_conditions: `• From this date, domains and hosting charges will be paid every year. A 95% advance required to start the project. Remaining balance upon completion.\n• Issues related to domains and hosting beyond the initial scope may be charged.\n• Negligence features or revisions beyond the initial scope may incur charges.\n• If the project is sold to any third party members.`,
      status: 'draft'
    });
    setSelectedClient(null);
    setShowQuotationList(false);
  };

  if (showQuotationList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Quotations</h1>
                <p className="text-gray-400">Manage your quotations</p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={createNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Quotation
            </motion.button>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${
                message.type === 'success'
                  ? 'bg-green-900/30 border border-green-700 text-green-400'
                  : 'bg-red-900/30 border border-red-700 text-red-400'
              }`}
            >
              {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{message.text}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quotations.map((quotation) => (
              <motion.div
                key={quotation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => loadQuotation(quotation.id)}
                className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {quotation.quotation_number}
                    </h3>
                    <p className="text-gray-400 text-sm">{quotation.client_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    quotation.status === 'accepted' ? 'bg-green-900/30 text-green-400 border border-green-700' :
                    quotation.status === 'sent' ? 'bg-blue-900/30 text-blue-400 border border-blue-700' :
                    quotation.status === 'rejected' ? 'bg-red-900/30 text-red-400 border border-red-700' :
                    'bg-gray-700 text-gray-400 border border-gray-600'
                  }`}>
                    {quotation.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(quotation.quotation_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white">
                    <span>Total:</span>
                    <span>LKR {quotation.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black p-6 print:p-0 print:bg-white">
      {/* Action Buttons - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 flex gap-4 print:hidden">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowQuotationList(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          <X className="w-5 h-5" />
          Back to List
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSave('draft')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
        >
          <Save className="w-5 h-5" />
          Save Draft
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSave('sent')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
        >
          <Send className="w-5 h-5" />
          Save & Send
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg ml-auto"
        >
          <Download className="w-5 h-5" />
          Print/PDF
        </motion.button>
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-4xl mx-auto mb-4 flex items-center gap-3 p-4 rounded-lg print:hidden ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-700 text-green-400'
              : 'bg-red-900/30 border border-red-700 text-red-400'
          }`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Client Selection - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Client *
          </label>
          <select
            value={formData.client_id}
            onChange={(e) => handleClientSelect(Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="0">Choose a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.client_name} {client.company_name ? `- ${client.company_name}` : ''}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Quotation Date
              </label>
              <input
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valid Until (Optional)
              </label>
              <input
                type="date"
                value={formData.valid_until || ''}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quotation Document */}
      <div ref={printRef} className="max-w-4xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden print:shadow-none">
        {/* Header */}
        <div className="print:break-inside-avoid">
          <img src="/Logo/PDFheader.PNG" alt="Header" className="w-full h-auto" />
        {/* Main Content */}
        <div className="p-8 print:p-6">
          {/* Quotation Title */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-blue-700 mb-2">QUOTATION</h1>
            <div className="text-gray-600">
              <p className="font-semibold">QUOTATION NO : {formData.quotation_number || 'DRAFT'}</p>
            </div>
          </div>

          {/* Client and Date Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="font-semibold text-gray-700 mb-2">
                QUOTATIONTO : 
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
                  {selectedClient.address && (
                    <p className="text-gray-600 text-sm">{selectedClient.address}</p>
                  )}
                  {selectedClient.email && (
                    <p className="text-gray-600 text-sm">{selectedClient.email}</p>
                  )}
                  {selectedClient.phone && (
                    <p className="text-gray-600 text-sm">{selectedClient.phone}</p>
                  )}
                </>
              )}
            </div>
            
            <div className="text-right">
              <p className="font-semibold text-gray-700">
                DATE : <span className="text-blue-700">{new Date(formData.quotation_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}</span>
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <div className="border-2 border-blue-700 rounded-lg overflow-hidden">
              <div className="bg-blue-700 text-white font-semibold grid grid-cols-12 gap-4 p-4">
                <div className="col-span-6">DESCRIPTION</div>
                <div className="col-span-3 text-center">PAYMENT METHOD</div>
                <div className="col-span-3 text-right">PRICE (LKR)</div>
              </div>
              
              {/* Editable Items - Hidden when printing */}
              <div className="print:hidden">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 items-start">
                    <div className="col-span-6">
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Enter description..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={item.payment_method}
                        onChange={(e) => updateItem(index, 'payment_method', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="One-Time">One-Time</option>
                        <option value="Annual">Annual</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                      </select>
                    </div>
                    <div className="col-span-3 flex gap-2">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-right"
                        placeholder="0.00"
                      />
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>

              {/* Print-only Items */}
              <div className="hidden print:block">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200">
                    <div className="col-span-6">
                      <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                    </div>
                    <div className="col-span-3 text-center text-sm">
                      {item.payment_method}
                    </div>
                    <div className="col-span-3 text-right text-sm font-semibold">
                      {item.price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-80">
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span className="font-semibold">Sub Total</span>
                  <span className="text-blue-700 font-bold">{formData.subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-300 print:hidden">
                  <span className="font-semibold">Discount</span>
                  <input
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-32 px-3 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex justify-between py-2 border-b border-gray-300 hidden print:flex">
                  <span className="font-semibold">Discount</span>
                  <span className="text-blue-700 font-bold">{formData.discount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between py-3 bg-blue-50 px-4 rounded mt-2">
                  <span className="font-bold text-lg">TOTAL AMOUNT</span>
                  <span className="text-blue-700 font-bold text-xl">{formData.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method & Terms */}
          <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
            <div>
              <h3 className="font-bold text-gray-700 mb-3">PAYMENT METHOD :</h3>
              <textarea
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 print:border-0 print:p-0 whitespace-pre-wrap"
                rows={5}
              />
            </div>

            <div>
              <h3 className="font-bold text-gray-700 mb-3">TERMS & CONDITIONS</h3>
              <textarea
                value={formData.terms_conditions}
                onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs print:border-0 print:p-0 whitespace-pre-wrap"
                rows={5}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="print:break-inside-avoid">
            <img src="/Logo/PDFfooter.PNG" alt="Footer" className="w-full h-auto" />
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: A4;
          }
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          textarea {
            border: none !important;
            background: transparent !important;
            resize: none !important;
            padding: 0 !important;
            outline: none !important;
          }
          input {
            border: none !important;
            background: transparent !important;
            outline: none !important;
          }
          /* Ensure header prints correctly */
          .wave-path, .wave-path-light {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
    </div>
  );
};

export default QuotationGenerator;
