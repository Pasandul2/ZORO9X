import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, ExternalLink, Github, Upload, Image as ImageIcon } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';

interface Portfolio {
  id: number;
  title: string;
  description: string;
  image: string;
  link?: string;
  github?: string;
  technologies?: string[];
}

interface PortfolioManagementProps {
  darkMode: boolean;
}

const PortfolioManagement: React.FC<PortfolioManagementProps> = ({ darkMode }) => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    link: '',
    github: '',
    technologies: ''
  });

  // Fetch all portfolios
  const fetchPortfolios = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/portfolio`);
      const data = await response.json();
      
      if (data.success) {
        setPortfolios(data.portfolio);
      }
    } catch (err) {
      setError('Failed to fetch portfolio items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload image to server
  const uploadImageToServer = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const token = localStorage.getItem('adminToken');
    if (!token) {
      setError('Unauthorized. Please login again.');
      return null;
    }

    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('image', imageFile);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/portfolio/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      const data = await response.json();

      if (data.success) {
        return data.imageUrl;
      } else {
        setError(data.message || 'Failed to upload image');
        return null;
      }
    } catch (err) {
      setError('Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Open modal for adding new portfolio
  const handleAdd = () => {
    setEditingId(null);
    setImageFile(null);
    setImagePreview('');
    setFormData({
      title: '',
      description: '',
      image: '',
      link: '',
      github: '',
      technologies: ''
    });
    setShowModal(true);
  };

  // Open modal for editing portfolio
  const handleEdit = (portfolio: Portfolio) => {
    setEditingId(portfolio.id);
    setImageFile(null);
    setImagePreview(portfolio.image.startsWith('/uploads/') 
      ? `${import.meta.env.VITE_API_URL}${portfolio.image}`
      : portfolio.image
    );
    setFormData({
      title: portfolio.title,
      description: portfolio.description,
      image: portfolio.image,
      link: portfolio.link || '',
      github: portfolio.github || '',
      technologies: portfolio.technologies ? portfolio.technologies.join(', ') : ''
    });
    setShowModal(true);
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = localStorage.getItem('adminToken');
    if (!token) {
      setError('Unauthorized. Please login again.');
      return;
    }

    // Upload image first if new image is selected
    let imageUrl = formData.image;
    if (imageFile) {
      const uploadedUrl = await uploadImageToServer();
      if (!uploadedUrl) {
        setError('Failed to upload image. Please try again.');
        return;
      }
      imageUrl = uploadedUrl;
    }

    // Validate that we have an image
    if (!imageUrl) {
      setError('Please select an image');
      return;
    }

    // Parse technologies
    const technologiesArray = formData.technologies
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      ...formData,
      image: imageUrl,
      technologies: technologiesArray,
      link: formData.link || undefined,
      github: formData.github || undefined
    };

    try {
      const url = editingId
        ? `${import.meta.env.VITE_API_URL}/api/portfolio/${editingId}`
        : `${import.meta.env.VITE_API_URL}/api/portfolio`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(editingId ? 'Portfolio updated successfully!' : 'Portfolio created successfully!');
        setShowModal(false);
        fetchPortfolios();
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Operation failed');
      }
    } catch (err) {
      setError('Failed to save portfolio item');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;

    const token = localStorage.getItem('adminToken');
    if (!token) {
      setError('Unauthorized. Please login again.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/portfolio/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Portfolio deleted successfully!');
        setDeleteId(null);
        fetchPortfolios();
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Delete failed');
      }
    } catch (err) {
      setError('Failed to delete portfolio item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Portfolio Management
        </h2>
        <motion.button
          onClick={handleAdd}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Portfolio
        </motion.button>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400"
          >
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portfolio Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map((portfolio) => (
          <motion.div
            key={portfolio.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl overflow-hidden border ${
              darkMode ? 'bg-gray-800/50 border-purple-500/20' : 'bg-white border-gray-200'
            }`}
          >
            {/* Image */}
            <div className="relative h-48 bg-gray-700">
              <img
                src={portfolio.image.startsWith('/uploads/') 
                  ? `${import.meta.env.VITE_API_URL}${portfolio.image}`
                  : portfolio.image
                }
                alt={portfolio.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                }}
              />
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {portfolio.title}
              </h3>
              <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {portfolio.description}
              </p>

              {/* Technologies */}
              {portfolio.technologies && portfolio.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {portfolio.technologies.map((tech, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Links */}
              <div className="flex gap-2 mb-4">
                {portfolio.link && (
                  <a
                    href={portfolio.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Live
                  </a>
                )}
                {portfolio.github && (
                  <a
                    href={portfolio.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                  >
                    <Github className="w-3 h-3" />
                    Code
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <motion.button
                  onClick={() => handleEdit(portfolio)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </motion.button>
                <motion.button
                  onClick={() => setDeleteId(portfolio.id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {portfolios.length === 0 && (
        <div className="text-center py-20">
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No portfolio items yet. Click "Add Portfolio" to create one.
          </p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-full max-w-2xl rounded-xl p-8 ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {editingId ? 'Edit Portfolio' : 'Add Portfolio'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={3}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Portfolio Image *
                  </label>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-4 relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                          setFormData({ ...formData, image: '' });
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* File Upload Button */}
                  <div className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
                    darkMode 
                      ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-700' 
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  } transition-colors cursor-pointer`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      required={!editingId && !imagePreview}
                    />
                    <div className="flex flex-col items-center gap-2">
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Uploading...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-purple-500" />
                          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {imagePreview ? 'Click to change image' : 'Click to upload image'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            PNG, JPG, GIF, WEBP up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Live Link
                  </label>
                  <input
                    type="url"
                    name="link"
                    value={formData.link}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    GitHub Link
                  </label>
                  <input
                    type="url"
                    name="github"
                    value={formData.github}
                    onChange={handleChange}
                    placeholder="https://github.com/..."
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Technologies (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="technologies"
                    value={formData.technologies}
                    onChange={handleChange}
                    placeholder="React, Node.js, MongoDB"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-medium"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex-1 py-3 rounded-lg font-medium ${
                      darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    Cancel
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Portfolio"
        message="Are you sure you want to delete this portfolio item? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default PortfolioManagement;
