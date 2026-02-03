import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

interface TableField {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: string;
}

interface Table {
  name: string;
  fields: TableField[];
}

const SystemGenerator: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedSystem, setGeneratedSystem] = useState<any>(null);
  
  // Form state
  const [systemName, setSystemName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  
  // Features
  const [basicFeatures, setBasicFeatures] = useState<string[]>(['Dashboard']);
  const [premiumFeatures, setPremiumFeatures] = useState<string[]>(['Dashboard', 'Advanced Analytics', 'Custom Reports']);
  const [newBasicFeature, setNewBasicFeature] = useState('');
  const [newPremiumFeature, setNewPremiumFeature] = useState('');
  
  // Simple default database structure (user can migrate later)
  const tables: Table[] = [
    {
      name: 'records',
      fields: [
        { name: 'id', type: 'INTEGER', primaryKey: true },
        { name: 'name', type: 'TEXT', notNull: true },
        { name: 'email', type: 'TEXT' },
        { name: 'phone', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
      ]
    }
  ];

  // Add basic feature
  const addBasicFeature = () => {
    if (newBasicFeature.trim()) {
      setBasicFeatures([...basicFeatures, newBasicFeature.trim()]);
      setNewBasicFeature('');
    }
  };

  // Add premium feature
  const addPremiumFeature = () => {
    if (newPremiumFeature.trim()) {
      setPremiumFeatures([...premiumFeatures, newPremiumFeature.trim()]);
      setNewPremiumFeature('');
    }
  };

  // Remove feature
  const removeBasicFeature = (index: number) => {
    setBasicFeatures(basicFeatures.filter((_, i) => i !== index));
  };

  const removePremiumFeature = (index: number) => {
    setPremiumFeatures(premiumFeatures.filter((_, i) => i !== index));
  };

  // Add new table
  const addTable = () => {
    if (newTableName.trim()) {
      setTables([
        ...tables,
        {
          name: newTableName.trim().toLowerCase().replace(/\s+/g, '_'),
          fields: [
            { name: 'id', type: 'INTEGER', primaryKey: true },
            { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
          ]
        }
      ]);
      setNewTableName('');
    }
  };

  // Add field to table
  const addFieldToTable = (tableIndex: number) => {
    const newTables = [...tables];
    newTables[tableIndex].fields.push({
      name: 'new_field',
      type: 'TEXT'
    });
    setTables(newTables);
  };

  // Update field
  const updateField = (tableIndex: number, fieldIndex: number, key: keyof TableField, value: any) => {
    const newTables = [...tables];
    newTables[tableIndex].fields[fieldIndex] = {
      ...newTables[tableIndex].fields[fieldIndex],
      [key]: value
    };
    setTables(newTables);
  };

  // Remove field
  const removeField = (tableIndex: number, fieldIndex: number) => {
    const newTables = [...tables];
    newTables[tableIndex].fields = newTables[tableIndex].fields.filter((_, i) => i !== fieldIndex);
    setTables(newTables);
  };

  // Generate system
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await axios.post(
        'http://localhost:5001/api/admin/generate-system',
        {
          name: systemName,
          description,
          category: category.toLowerCase().replace(/\s+/g, '_'),
          icon_url: iconUrl,
          features_basic: basicFeatures,
          features_premium: premiumFeatures,
          tables
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setGeneratedSystem(response.data.system);
      setStep(4);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to generate system');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl shadow-sm p-8 mb-6"
        >
          <h1 className="text-3xl font-bold text-white mb-2">
            🚀 System Generator
          </h1>
          <p className="text-gray-300">
            Automatically generate complete Python desktop applications with Basic & Premium tiers
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {['Basic Info', 'Features', 'Generate'].map((label, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step > index + 1
                      ? 'bg-green-500 text-white'
                      : step === index + 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-300">{label}</span>
                {index < 3 && <div className="w-16 h-1 bg-gray-600 mx-4"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-800 rounded-xl shadow-sm p-8"
        >
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Basic Information</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  System Name *
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  placeholder="e.g., Restaurant Management"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., restaurant, salon, hotel"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
                <p className="mt-1 text-sm text-gray-400">
                  Use lowercase, no spaces (e.g., "restaurant" not "Restaurant Management")
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the system..."
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon URL (optional)
                </label>
                <input
                  type="text"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="/images/restaurant-icon.png"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!systemName || !category}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Next: Features →
              </button>
            </div>
          )}

          {/* Step 2: Features */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">System Features</h2>

              {/* Basic Features */}
              <div className="border border-gray-600 rounded-lg p-6 bg-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">
                  📦 Basic Edition Features
                </h3>
                
                <div className="space-y-2 mb-4">
                  {basicFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-700/50"
                    >
                      <span className="text-gray-200">{feature}</span>
                      <button
                        onClick={() => removeBasicFeature(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBasicFeature}
                    onChange={(e) => setNewBasicFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBasicFeature()}
                    placeholder="Add feature..."
                    className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  />
                  <button
                    onClick={addBasicFeature}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Premium Features */}
              <div className="border border-yellow-600 bg-yellow-900/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  ⭐ Premium Edition Features
                </h3>
                
                <div className="space-y-2 mb-4">
                  {premiumFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-yellow-900/40 px-4 py-2 rounded-lg border border-yellow-700/50"
                    >
                      <span className="text-gray-200">{feature}</span>
                      <button
                        onClick={() => removePremiumFeature(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPremiumFeature}
                    onChange={(e) => setNewPremiumFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPremiumFeature()}
                    placeholder="Add premium feature..."
                    className="flex-1 px-4 py-2 bg-gray-600 border border-gray-500 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 placeholder-gray-400"
                  />
                  <button
                    onClick={addPremiumFeature}
                    className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-600"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Next: Database →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Generate */}
          {step === 3 && !generatedSystem && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Review & Generate</h2>

              <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-300">System Name:</h3>
                  <p className="text-white">{systemName}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300">Category:</h3>
                  <p className="text-white">{category}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300">Basic Features ({basicFeatures.length}):</h3>
                  <ul className="list-disc list-inside text-gray-300">
                    {basicFeatures.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300">Premium Features ({premiumFeatures.length}):</h3>
                  <ul className="list-disc list-inside text-gray-300">
                    {premiumFeatures.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300">Database Tables ({tables.length}):</h3>
                  <ul className="list-disc list-inside text-gray-300">
                    {tables.map((t, i) => (
                      <li key={i}>
                        {t.name} ({t.fields.length} fields)
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4">
                <p className="text-blue-300">
                  <strong>🚀 Ready to generate!</strong> This will create:
                </p>
                <ul className="list-disc list-inside text-blue-200 mt-2">
                  <li>Basic version Python application</li>
                  <li>Premium version Python application</li>
                  <li>Installation wizard for both versions</li>
                  <li>Database records with 2 subscription plans</li>
                  <li>Complete file structure in systems/ folder</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-700 text-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-600"
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-600"
                >
                  {loading ? 'Generating...' : '✨ Generate System'}
                </button>
              </div>
            </div>
          )}

          {/* Success Screen */}
          {step === 3 && generatedSystem && (
            <div className="text-center space-y-6">
              <div className="text-6xl">✅</div>
              <h2 className="text-3xl font-bold text-green-400">System Generated Successfully!</h2>
              
              <div className="bg-green-900/20 border border-green-600 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-green-300 mb-3">Created:</h3>
                <ul className="space-y-2 text-green-200">
                  <li>✓ System ID: {generatedSystem.id}</li>
                  <li>✓ Basic Path: {generatedSystem.basic_path}</li>
                  <li>✓ Premium Path: {generatedSystem.premium_path}</li>
                  <li className="mt-4 font-semibold">Files:</li>
                  {generatedSystem.files_created.map((file: string, i: number) => (
                    <li key={i} className="ml-4">✓ {file}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/admin/saas'}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 text-lg"
                >
                  ← Back to Dashboard
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-700 text-gray-200 py-3 rounded-lg font-semibold hover:bg-gray-600"
                >
                  Generate Another System
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SystemGenerator;
