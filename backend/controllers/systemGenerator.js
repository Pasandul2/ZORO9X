/**
 * System Generator Controller
 * Auto-generates complete Python desktop applications with Basic & Premium tiers
 */

const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { generatePythonApp } = require('../templates/pythonTemplate');
const { generateInstaller } = require('../templates/installerTemplate');

/**
 * Generate complete system with Basic and Premium versions
 */
exports.generateSystem = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Log incoming request for debugging
    console.log('📥 Received generate-system request');
    console.log('   Has file:', !!req.file);
    console.log('   Body keys:', Object.keys(req.body));
    console.log('   Body:', req.body);
    
    // Parse JSON fields if they come as strings (from FormData)
    let features_basic = req.body.features_basic;
    let features_premium = req.body.features_premium;
    let tables = req.body.tables;
    
    if (typeof features_basic === 'string') {
      try {
        features_basic = JSON.parse(features_basic);
      } catch (e) {
        console.error('   Error parsing features_basic:', e.message);
      }
    }
    if (typeof features_premium === 'string') {
      try {
        features_premium = JSON.parse(features_premium);
      } catch (e) {
        console.error('   Error parsing features_premium:', e.message);
      }
    }
    if (typeof tables === 'string') {
      try {
        tables = JSON.parse(tables);
      } catch (e) {
        console.error('   Error parsing tables:', e.message);
      }
    }
    
    const {
      name,
      description,
      category,
      icon_url,
    } = req.body;
    const serverApiUrl = (process.env.ZORO9X_PUBLIC_API_URL || process.env.ZORO9X_API_URL || process.env.API_URL || '').trim();
    
    // Debug logging - show what we have
    console.log('   After parsing:');
    console.log('     name:', name);
    console.log('     category:', category);
    console.log('     features_basic:', features_basic);
    console.log('     tables:', tables);
    console.log('     description:', description);
    
    // Handle icon upload or URL
    let finalIconUrl = icon_url || '/images/default-icon.png';
    if (req.file) {
      // If a file was uploaded, use the upload path
      finalIconUrl = `/uploads/icons/${req.file.filename}`;
      console.log(`✅ Icon uploaded: ${finalIconUrl}`);
    }
    // Validate input - check each field individually
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!category) missingFields.push('category');
    if (!features_basic) missingFields.push('features_basic');
    if (!tables) missingFields.push('tables');
    
    if (missingFields.length > 0) {
      console.error('❌ Missing fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    console.log(`🚀 Generating system: ${name}`);
    console.log(`📁 Category: ${category}`);
    
    // Check if category already exists
    const [existingSystems] = await connection.execute(
      'SELECT id, name FROM systems WHERE category = ?',
      [category]
    );
    
    if (existingSystems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `A system with category "${category}" already exists: "${existingSystems[0].name}". Please use a different category name.`
      });
    }
    
    // Validate tables have fields
    if (!tables || tables.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one database table is required'
      });
    }
    
    for (const table of tables) {
      if (!table.fields || table.fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Table "${table.name}" must have at least one field`
        });
      }
    }
    
    // 1. Create folder structure
    const systemBasePath = path.join(__dirname, '../../systems', `${category}_management`);
    const basicPath = path.join(systemBasePath, 'basic');
    const premiumPath = path.join(systemBasePath, 'premium');
    
    // Create directories
    if (!fs.existsSync(basicPath)) {
      fs.mkdirSync(basicPath, { recursive: true });
      console.log(`✅ Created folder: ${basicPath}`);
    }
    
    if (!fs.existsSync(premiumPath)) {
      fs.mkdirSync(premiumPath, { recursive: true });
      console.log(`✅ Created folder: ${premiumPath}`);
    }
    
    // 2. Generate BASIC version Python app
    console.log('📝 Generating Basic version...');
    const basicAppCode = generatePythonApp({
      systemName: name,
      category,
      tables,
      features: features_basic,
      tier: 'basic',
      apiUrl: serverApiUrl,
    });
    
    fs.writeFileSync(
      path.join(basicPath, `${category}_app.py`),
      basicAppCode
    );
    console.log(`✅ Created: ${category}_app.py (Basic)`);
    
    // 3. Generate PREMIUM version Python app
    console.log('📝 Generating Premium version...');
    const premiumAppCode = generatePythonApp({
      systemName: name,
      category,
      tables,
      features: features_premium || [...features_basic, 'Advanced Analytics', 'Custom Reports'],
      tier: 'premium',
      apiUrl: serverApiUrl,
    });
    
    fs.writeFileSync(
      path.join(premiumPath, `${category}_app.py`),
      premiumAppCode
    );
    console.log(`✅ Created: ${category}_app.py (Premium)`);
    
    // 4. Generate custom installer for both versions
    
    // Basic installer
    const basicInstallerCode = generateInstaller({
      systemName: name,
      category,
      features: features_basic,
      tier: 'basic',
      apiUrl: serverApiUrl,
    });
    fs.writeFileSync(path.join(basicPath, 'installer.py'), basicInstallerCode);
    
    // Premium installer  
    const premiumInstallerCode = generateInstaller({
      systemName: name,
      category,
      features: features_premium || [...features_basic, 'Advanced Analytics'],
      tier: 'premium',
      apiUrl: serverApiUrl,
    });
    fs.writeFileSync(path.join(premiumPath, 'installer.py'), premiumInstallerCode);
    console.log('✅ Created custom installer.py for both versions');

    fs.writeFileSync(path.join(basicPath, 'server_api_url.txt'), `${serverApiUrl}\n`);
    fs.writeFileSync(path.join(premiumPath, 'server_api_url.txt'), `${serverApiUrl}\n`);
    console.log('✅ Saved server_api_url.txt for both versions');
    
    // 5. Create requirements.txt (build-time dependencies)
    const requirements = `pyinstaller
  pywin32
  `;
    
    fs.writeFileSync(path.join(basicPath, 'requirements.txt'), requirements);
    fs.writeFileSync(path.join(premiumPath, 'requirements.txt'), requirements);
    console.log('✅ Created requirements.txt');
    
    // 6. Create README.md
    const readme = `# ${name}

Auto-generated by ZORO9X SaaS Platform

## Features

### Basic Edition
${features_basic.map(f => `- ${f}`).join('\n')}

### Premium Edition
${(features_premium || features_basic).map(f => `- ${f}`).join('\n')}

## Installation

1. Build the installer: run \`BUILD.bat\`
2. Share only \`dist/${category}_installer.exe\` with end users
3. User runs the installer and enters install path, API key, and setup info

## Support

For support, contact: support@zoro9x.com
`;
    
    fs.writeFileSync(path.join(basicPath, 'README.md'), readme);
    fs.writeFileSync(path.join(premiumPath, 'README.md'), readme);
    console.log('✅ Created README.md');
    
    // 7. Create PyInstaller spec files for app + installer executables
    const appSpecFile = `# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['${category}_app.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=['tkinter', 'sqlite3', 'requests', 'hashlib', 'platform', 'uuid'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='${category}_app',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
`;

    const installerSpecFile = `# -*- mode: python ; coding: utf-8 -*-

import os

block_cipher = None

dist_app_exe = os.path.join(os.getcwd(), 'dist', '${category}_app.exe')

a = Analysis(
    ['installer.py'],
    pathex=[],
    binaries=[(dist_app_exe, '.')] if os.path.exists(dist_app_exe) else [],
    datas=[('README.md', '.')] if os.path.exists('README.md') else [],
    hiddenimports=['tkinter', 'sqlite3', 'subprocess', 'json', 'shutil'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='${category}_installer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
`;
    
    fs.writeFileSync(path.join(basicPath, 'app.spec'), appSpecFile);
    fs.writeFileSync(path.join(basicPath, 'installer.spec'), installerSpecFile);
    fs.writeFileSync(path.join(premiumPath, 'app.spec'), appSpecFile);
    fs.writeFileSync(path.join(premiumPath, 'installer.spec'), installerSpecFile);
    console.log('✅ Created app.spec and installer.spec files');
    
    // 8. Create build script for compilation
    const buildScript = `@echo off
cd /d "%~dp0"
echo Building ${name}...
echo.

REM Install Python dependencies
pip install -r "%~dp0requirements.txt"

REM Install PyInstaller if not present
pip install pyinstaller

REM Build application executable first
python -m PyInstaller --noconfirm --clean "%~dp0app.spec"

if %errorlevel% neq 0 (
  echo.
  echo App build failed.
  exit /b 1
)

REM Build installer executable that bundles app executable
python -m PyInstaller --noconfirm --clean "%~dp0installer.spec"

if %errorlevel% neq 0 (
  echo.
  echo Installer build failed.
  exit /b 1
)

echo.
echo Build complete!
echo App: dist\\${category}_app.exe
echo Share this with users: dist\\${category}_installer.exe
exit /b 0
`;
    
    fs.writeFileSync(path.join(basicPath, 'BUILD.bat'), buildScript);
    fs.writeFileSync(path.join(premiumPath, 'BUILD.bat'), buildScript);
    console.log('✅ Created BUILD.bat scripts');
    
    // 7. Insert system into database
    const [systemResult] = await connection.execute(
      `INSERT INTO systems (name, description, category, python_file_path, icon_url, features, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        category,
        `${category}_management/`,
        finalIconUrl,
        JSON.stringify(features_basic),
        'active'
      ]
    );
    
    const systemId = systemResult.insertId;
    console.log(`✅ Created system record in database (ID: ${systemId})`);
    
    // 8. Create default subscription plans
    
    // Basic Plan
    await connection.execute(
      `INSERT INTO subscription_plans 
       (system_id, name, description, price, billing_cycle, features, max_users, max_storage_gb, support_level, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        systemId,
        'Basic',
        `${name} Basic Edition with essential features`,
        29.99,
        'monthly',
        JSON.stringify(features_basic),
        5,
        5,
        'email',
        true
      ]
    );
    console.log('✅ Created Basic plan');
    
    // Premium Plan
    await connection.execute(
      `INSERT INTO subscription_plans 
       (system_id, name, description, price, billing_cycle, features, max_users, max_storage_gb, support_level, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        systemId,
        'Premium',
        `${name} Premium Edition with all features`,
        79.99,
        'monthly',
        JSON.stringify(features_premium || [...features_basic, 'Advanced Analytics', 'Priority Support']),
        50,
        50,
        'priority',
        true
      ]
    );
    console.log('✅ Created Premium plan');
    
    await connection.commit();
    
    res.json({
      success: true,
      message: `System "${name}" generated successfully with Basic and Premium versions!`,
      system: {
        id: systemId,
        name,
        category,
        python_file_path: `${category}_management/`,
        server_api_url: serverApiUrl,
        basic_path: `systems/${category}_management/basic/`,
        premium_path: `systems/${category}_management/premium/`,
        files_created: [
          `${category}_app.py (Basic & Premium)`,
          'installer.py (Basic & Premium)',
          'requirements.txt (Basic & Premium)',
          'README.md (Basic & Premium)'
        ]
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error generating system:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate system',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Get all generated systems
 */
exports.getGeneratedSystems = async (req, res) => {
  try {
    const [systems] = await pool.execute(
      `SELECT s.*, 
       COUNT(DISTINCT sp.id) as plan_count,
       COUNT(DISTINCT cs.id) as subscription_count
       FROM systems s
       LEFT JOIN subscription_plans sp ON s.id = sp.system_id
       LEFT JOIN client_subscriptions cs ON s.id = cs.system_id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );
    
    const parsedSystems = systems.map(system => ({
      ...system,
      features: JSON.parse(system.features || '[]')
    }));
    
    res.json({
      success: true,
      systems: parsedSystems
    });
  } catch (error) {
    console.error('Error fetching generated systems:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch systems'
    });
  }
};

/**
 * Delete generated system and its files
 */
exports.deleteGeneratedSystem = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    
    // Get system details
    const [systems] = await connection.execute(
      'SELECT * FROM systems WHERE id = ?',
      [id]
    );
    
    if (systems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'System not found'
      });
    }
    
    const system = systems[0];
    
    // Check if system has active subscriptions
    const [subscriptions] = await connection.execute(
      'SELECT COUNT(*) as count FROM client_subscriptions WHERE system_id = ? AND status = ?',
      [id, 'active']
    );
    
    if (subscriptions[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system with active subscriptions'
      });
    }
    
    // Delete plans
    await connection.execute(
      'DELETE FROM subscription_plans WHERE system_id = ?',
      [id]
    );
    
    // Delete system
    await connection.execute(
      'DELETE FROM systems WHERE id = ?',
      [id]
    );
    
    // Delete files
    const systemPath = path.join(__dirname, '../../', system.python_file_path);
    if (fs.existsSync(systemPath)) {
      fs.rmSync(systemPath, { recursive: true, force: true });
      console.log(`🗑️ Deleted folder: ${systemPath}`);
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'System deleted successfully'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete system'
    });
  } finally {
    connection.release();
  }
};

/**
 * Regenerate system files
 */
exports.regenerateSystem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get system details
    const [systems] = await pool.execute(
      'SELECT * FROM systems WHERE id = ?',
      [id]
    );
    
    if (systems.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'System not found'
      });
    }
    
    const system = systems[0];
    
    // Get plans
    const [plans] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE system_id = ? ORDER BY price',
      [id]
    );
    
    if (plans.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'System must have both Basic and Premium plans'
      });
    }
    
    const basicPlan = plans[0];
    const premiumPlan = plans[1];
    
    // Extract category from python_file_path
    const pathParts = system.python_file_path.split('/');
    const category = pathParts[1]?.replace('_management', '') || 'custom';
    
    // Regenerate files
    const basicPath = path.join(__dirname, '../../', system.python_file_path, 'basic');
    const premiumPath = path.join(__dirname, '../../', system.python_file_path, 'premium');
    const apiUrlFile = path.join(basicPath, 'server_api_url.txt');
    const serverApiUrl = fs.existsSync(apiUrlFile)
      ? fs.readFileSync(apiUrlFile, 'utf8').trim()
      : (process.env.ZORO9X_PUBLIC_API_URL || process.env.ZORO9X_API_URL || '');
    
    // Create mock tables (you can enhance this to store table definitions)
    const mockTables = [
      {
        name: 'records',
        fields: [
          { name: 'id', type: 'INTEGER', primaryKey: true },
          { name: 'name', type: 'TEXT', notNull: true },
          { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        ]
      }
    ];
    
    // Regenerate Basic
    const basicAppCode = generatePythonApp({
      systemName: system.name,
      category,
      tables: mockTables,
      features: JSON.parse(basicPlan.features),
      tier: 'basic',
      apiUrl: serverApiUrl,
    });
    
    fs.writeFileSync(
      path.join(basicPath, `${category}_app.py`),
      basicAppCode
    );
    
    // Regenerate Premium
    const premiumAppCode = generatePythonApp({
      systemName: system.name,
      category,
      tables: mockTables,
      features: JSON.parse(premiumPlan.features),
      tier: 'premium',
      apiUrl: serverApiUrl,
    });
    
    fs.writeFileSync(
      path.join(premiumPath, `${category}_app.py`),
      premiumAppCode
    );

    const basicInstallerCode = generateInstaller({
      systemName: system.name,
      category,
      features: JSON.parse(basicPlan.features),
      tier: 'basic',
      apiUrl: serverApiUrl,
    });
    const premiumInstallerCode = generateInstaller({
      systemName: system.name,
      category,
      features: JSON.parse(premiumPlan.features),
      tier: 'premium',
      apiUrl: serverApiUrl,
    });

    fs.writeFileSync(path.join(basicPath, 'installer.py'), basicInstallerCode);
    fs.writeFileSync(path.join(premiumPath, 'installer.py'), premiumInstallerCode);
    fs.writeFileSync(path.join(basicPath, 'server_api_url.txt'), `${serverApiUrl}\n`);
    fs.writeFileSync(path.join(premiumPath, 'server_api_url.txt'), `${serverApiUrl}\n`);
    
    res.json({
      success: true,
      message: 'System files regenerated successfully'
    });
    
  } catch (error) {
    console.error('Error regenerating system:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate system'
    });
  }
};
