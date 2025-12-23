/**
 * Portfolio Controller
 * Handles CRUD operations for portfolio items
 */

const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * Upload portfolio image
 * @route POST /api/portfolio/upload
 * @access Private (Admin only)
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Return the file path that can be used in the database
    const imageUrl = `/uploads/portfolio/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
};

/**
 * Delete portfolio image file
 * @param {string} imagePath - The image path from database
 */
const deleteImageFile = (imagePath) => {
  try {
    if (imagePath && imagePath.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted image file: ${imagePath}`);
      }
    }
  } catch (error) {
    console.error('Error deleting image file:', error);
  }
};

/**
 * Get all portfolio items
 * @route GET /api/portfolio
 * @access Public
 */
const getAllPortfolio = async (req, res) => {
  try {
    const [portfolio] = await pool.query(
      'SELECT * FROM portfolio ORDER BY created_at DESC'
    );

    // Parse technologies JSON for each item
    const parsedPortfolio = portfolio.map(item => ({
      ...item,
      technologies: item.technologies ? JSON.parse(item.technologies) : []
    }));

    res.status(200).json({ 
      success: true,
      portfolio: parsedPortfolio 
    });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch portfolio items' 
    });
  }
};

/**
 * Get single portfolio item by ID
 * @route GET /api/portfolio/:id
 * @access Public
 */
const getPortfolioById = async (req, res) => {
  try {
    const { id } = req.params;

    const [portfolio] = await pool.query(
      'SELECT * FROM portfolio WHERE id = ?',
      [id]
    );

    if (portfolio.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio item not found' 
      });
    }

    const item = {
      ...portfolio[0],
      technologies: portfolio[0].technologies ? JSON.parse(portfolio[0].technologies) : []
    };

    res.status(200).json({ 
      success: true,
      portfolio: item 
    });
  } catch (error) {
    console.error('Error fetching portfolio item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch portfolio item' 
    });
  }
};

/**
 * Create new portfolio item
 * @route POST /api/admin/portfolio
 * @access Private (Admin only)
 */
const createPortfolio = async (req, res) => {
  try {
    const { title, description, image, link, github, technologies } = req.body;

    // Validate required fields
    if (!title || !description || !image) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, description, and image are required' 
      });
    }

    // Convert technologies array to JSON string
    const techJson = technologies ? JSON.stringify(technologies) : null;

    const [result] = await pool.query(
      'INSERT INTO portfolio (title, description, image, link, github, technologies) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, image, link || null, github || null, techJson]
    );

    res.status(201).json({ 
      success: true,
      message: 'Portfolio item created successfully',
      portfolio: {
        id: result.insertId,
        title,
        description,
        image,
        link,
        github,
        technologies
      }
    });
  } catch (error) {
    console.error('Error creating portfolio item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create portfolio item' 
    });
  }
};

/**
 * Update portfolio item
 * @route PUT /api/admin/portfolio/:id
 * @access Private (Admin only)
 */
const updatePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image, link, github, technologies } = req.body;

    // Check if portfolio item exists
    const [existing] = await pool.query(
      'SELECT * FROM portfolio WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio item not found' 
      });
    }

    // Convert technologies array to JSON string
    const techJson = technologies ? JSON.stringify(technologies) : null;

    await pool.query(
      'UPDATE portfolio SET title = ?, description = ?, image = ?, link = ?, github = ?, technologies = ? WHERE id = ?',
      [title, description, image, link || null, github || null, techJson, id]
    );

    res.status(200).json({ 
      success: true,
      message: 'Portfolio item updated successfully',
      portfolio: {
        id,
        title,
        description,
        image,
        link,
        github,
        technologies
      }
    });
  } catch (error) {
    console.error('Error updating portfolio item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update portfolio item' 
    });
  }
};

/**
 * Delete portfolio item
 * @route DELETE /api/admin/portfolio/:id
 * @access Private (Admin only)
 */
const deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if portfolio item exists
    const [existing] = await pool.query(
      'SELECT * FROM portfolio WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio item not found' 
      });
    }

    // Delete the image file if it exists
    const portfolio = existing[0];
    deleteImageFile(portfolio.image);

    await pool.query('DELETE FROM portfolio WHERE id = ?', [id]);

    res.status(200).json({ 
      success: true,
      message: 'Portfolio item deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting portfolio item:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete portfolio item' 
    });
  }
};

module.exports = {
  getAllPortfolio,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  uploadImage
};
