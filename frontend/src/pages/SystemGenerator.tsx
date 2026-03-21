import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const MIN_GENERATION_ANIMATION_MS = 10000;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedSystem, setGeneratedSystem] = useState<any>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('Preparing generation...');
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  
  // Form state
  const [systemName, setSystemName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconMode, setIconMode] = useState<'url' | 'upload'>('url');
  const [iconPreview, setIconPreview] = useState<string>('');
  
  // Features
  const [basicFeatures, setBasicFeatures] = useState<string[]>(['Dashboard']);
  const [premiumFeatures, setPremiumFeatures] = useState<string[]>(['Dashboard', 'Advanced Analytics', 'Custom Reports']);
  const [newBasicFeature, setNewBasicFeature] = useState('');
  const [newPremiumFeature, setNewPremiumFeature] = useState('');
  
  // Database tables state
  const [tables, setTables] = useState<Table[]>([
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
  ]);
  const [newTableName, setNewTableName] = useState('');

  useEffect(() => {
    if (!showCompletionPopup) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCompletionPopup(false);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [showCompletionPopup]);

  useEffect(() => {
    const adminScrollContainer = document.getElementById('admin-content-scroll');

    if (adminScrollContainer) {
      adminScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const openSystemDashboard = (action: 'view' | 'edit' | 'plans') => {
    if (!generatedSystem?.id) {
      navigate('/admin/saas');
      return;
    }

    sessionStorage.setItem(
      'zoro9xAdminSystemAction',
      JSON.stringify({
        systemId: generatedSystem.id,
        action,
      })
    );

    navigate('/admin/saas');
  };

  // Handle icon file selection
  const handleIconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove icon file
  const removeIconFile = () => {
    setIconFile(null);
    setIconPreview('');
  };

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

  const moveFeature = (
    features: string[],
    setFeatures: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    direction: 'up' | 'down'
  ) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= features.length) {
      return;
    }

    const reordered = [...features];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);
    setFeatures(reordered);
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
    setGenerationProgress(0);
    setGenerationMessage('Validating generation payload...');

    const progressMessages = [
      'Creating system folders...',
      'Generating Python applications...',
      'Generating installer files...',
      'Writing build files and README...',
      'Saving system and plans to database...',
    ];

    const generationStartedAt = Date.now();
    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - generationStartedAt;
      const progressRatio = Math.min(elapsed / MIN_GENERATION_ANIMATION_MS, 0.96);
      const nextProgress = Math.floor(progressRatio * 100);
      const messageIndex = Math.min(
        progressMessages.length - 1,
        Math.floor(progressRatio * progressMessages.length)
      );

      setGenerationProgress(nextProgress);
      setGenerationMessage(progressMessages[messageIndex]);
    }, 100);

    try {
      const token = localStorage.getItem('adminToken');
      
      // Debug logging
      console.log('🚀 Generating system...');
      console.log('   Name:', systemName);
      console.log('   Category:', category);
      console.log('   Basic Features:', basicFeatures);
      console.log('   Premium Features:', premiumFeatures);
      console.log('   Tables:', tables);
      console.log('   Has icon file:', !!iconFile);
      console.log('   Icon URL:', iconUrl);
      
      // Use FormData if uploading a file, otherwise use JSON
      let response;
      
      if (iconFile) {
        // Upload with file
        console.log('📤 Sending with FormData (file upload)');
        const formData = new FormData();
        formData.append('name', systemName);
        formData.append('description', description);
        formData.append('category', category.toLowerCase().replace(/\s+/g, '_'));
        formData.append('features_basic', JSON.stringify(basicFeatures));
        formData.append('features_premium', JSON.stringify(premiumFeatures));
        formData.append('tables', JSON.stringify(tables));
        formData.append('icon', iconFile);
        
        // Let axios automatically set Content-Type with boundary
        response = await axios.post(
          'http://localhost:5001/api/admin/generate-system',
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`
              // Do NOT set Content-Type manually - axios will set it with boundary
            }
          }
        );
      } else {
        // Upload without file
        console.log('📤 Sending with JSON (no file)');
        const payload = {
          name: systemName,
          description,
          category: category.toLowerCase().replace(/\s+/g, '_'),
          icon_url: iconUrl,
          features_basic: basicFeatures,
          features_premium: premiumFeatures,
          tables,
        };
        console.log('   Payload:', payload);
        
        response = await axios.post(
          'http://localhost:5001/api/admin/generate-system',
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }

      console.log('✅ System generated successfully');
      setGeneratedSystem(response.data.system);

      const elapsed = Date.now() - generationStartedAt;
      const remainingAnimationTime = Math.max(0, MIN_GENERATION_ANIMATION_MS - elapsed);
      if (remainingAnimationTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingAnimationTime));
      }

      setGenerationProgress(100);
      setGenerationMessage('System generation completed successfully.');
      setShowCompletionPopup(true);
      setStep(3);
    } catch (error: any) {
      console.error('❌ Generation failed:', error.response?.data || error.message);

      const elapsed = Date.now() - generationStartedAt;
      const remainingAnimationTime = Math.max(0, MIN_GENERATION_ANIMATION_MS - elapsed);
      if (remainingAnimationTime > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingAnimationTime));
      }

      alert(error.response?.data?.message || 'Failed to generate system');
    } finally {
      window.clearInterval(progressTimer);
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
            {['Basic Info', 'Features', 'Complete'].map((label, index) => (
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
                  System Icon (optional)
                </label>
                
                {/* Toggle between URL and Upload */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIconMode('url');
                      removeIconFile();
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      iconMode === 'url'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🔗 URL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIconMode('upload');
                      setIconUrl('');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      iconMode === 'upload'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    📁 Upload File
                  </button>
                </div>

                {/* URL Input */}
                {iconMode === 'url' && (
                  <input
                    type="text"
                    value={iconUrl}
                    onChange={(e) => setIconUrl(e.target.value)}
                    placeholder="/images/restaurant-icon.png"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                  />
                )}

                {/* File Upload */}
                {iconMode === 'upload' && (
                  <div>
                    {!iconFile ? (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIconFileChange}
                          className="hidden"
                          id="icon-upload"
                        />
                        <label
                          htmlFor="icon-upload"
                          className="flex items-center justify-center w-full px-4 py-8 bg-gray-700 border-2 border-dashed border-gray-600 text-gray-300 rounded-lg cursor-pointer hover:bg-gray-600 hover:border-gray-500 transition"
                        >
                          <div className="text-center">
                            <div className="text-4xl mb-2">📤</div>
                            <div className="font-medium">Click to browse and upload icon</div>
                            <div className="text-sm text-gray-400 mt-1">
                              PNG, JPG, SVG, ICO, GIF, WEBP (max 5MB)
                            </div>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 p-4 bg-gray-700 border border-gray-600 rounded-lg">
                        {iconPreview && (
                          <img
                            src={iconPreview}
                            alt="Icon preview"
                            className="w-16 h-16 object-cover rounded-lg border border-gray-500"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-white">{iconFile.name}</div>
                          <div className="text-sm text-gray-400">
                            {(iconFile.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={removeIconFile}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveFeature(basicFeatures, setBasicFeatures, index, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveFeature(basicFeatures, setBasicFeatures, index, 'down')}
                          disabled={index === basicFeatures.length - 1}
                          className="px-2 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeBasicFeature(index)}
                          className="text-red-400 hover:text-red-300"
                          title="Remove feature"
                        >
                          ✕
                        </button>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveFeature(premiumFeatures, setPremiumFeatures, index, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveFeature(premiumFeatures, setPremiumFeatures, index, 'down')}
                          disabled={index === premiumFeatures.length - 1}
                          className="px-2 py-1 text-xs rounded bg-gray-600 text-white hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removePremiumFeature(index)}
                          className="text-red-400 hover:text-red-300"
                          title="Remove feature"
                        >
                          ✕
                        </button>
                      </div>
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
              <h2 className="text-3xl font-bold text-green-400">System Generated Successfully</h2>
              <p className="text-gray-300 max-w-2xl mx-auto">
                The system has been fully generated and registered in the SaaS platform. You can now open the systems dashboard, edit this system, or manage its plans.
              </p>
              
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

              <div className="grid md:grid-cols-3 gap-3">
                <button
                  onClick={() => openSystemDashboard('view')}
                  className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 text-lg"
                >
                  Go To Systems
                </button>
                <button
                  onClick={() => openSystemDashboard('edit')}
                  className="w-full bg-purple-600 text-white py-4 rounded-lg font-semibold hover:bg-purple-700 text-lg"
                >
                  Edit System
                </button>
                <button
                  onClick={() => openSystemDashboard('plans')}
                  className="w-full bg-cyan-600 text-white py-4 rounded-lg font-semibold hover:bg-cyan-700 text-lg"
                >
                  Manage Plans
                </button>
              </div>

              <div className="space-y-3">
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

      {loading && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-gray-800 border border-blue-500/30 rounded-2xl p-8 shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">⚙️</div>
              <h3 className="text-2xl font-bold text-white">Generating System</h3>
              <p className="text-gray-300 mt-2">{generationMessage}</p>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-green-500"
                animate={{ width: `${generationProgress}%` }}
                transition={{ ease: 'easeOut', duration: 0.35 }}
                style={{ width: `${generationProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Processing generated files and database records</span>
              <span>{generationProgress}%</span>
            </div>
          </motion.div>
        </div>
      )}

      {showCompletionPopup && (
        <div className="fixed top-6 right-6 z-[60]">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-600 text-white px-5 py-4 rounded-xl shadow-2xl border border-green-400/30"
          >
            <div className="font-semibold">System generation complete</div>
            <div className="text-sm text-green-50 mt-1">Step 3 is ready with system actions.</div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SystemGenerator;
