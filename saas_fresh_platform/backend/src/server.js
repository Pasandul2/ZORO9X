const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { initDb, getDb } = require('./db');
const { port, adminApiKey, jwtSecret } = require('./config');
const { generateActivationKey, nowIso, addDays, signRuntimeToken } = require('./licenseService');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'products');
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 500 }
});

const app = express();
app.use(cors());
app.use(express.json());

function signAdminToken(admin) {
  return jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      scope: 'admin'
    },
    jwtSecret,
    { expiresIn: '12h' }
  );
}

function signCustomerToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      scope: 'customer'
    },
    jwtSecret,
    { expiresIn: '7d' }
  );
}

function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim();
}

function requireAdminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key && key === adminApiKey) {
    req.admin = { role: 'api_key' };
    return next();
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.scope !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.admin = payload;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
}

function getOptionalCustomer(req) {
  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.scope !== 'customer') {
      return null;
    }
    return payload;
  } catch (_error) {
    return null;
  }
}

function requireCustomerAuth(req, res, next) {
  const customer = getOptionalCustomer(req);
  if (!customer) {
    return res.status(401).json({ error: 'Customer authentication required' });
  }
  req.customer = customer;
  return next();
}

async function createEvent(licenseId, eventType, metadata) {
  const db = getDb();
  await db.query(
    'INSERT INTO license_events (id, license_id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), licenseId, eventType, JSON.stringify(metadata || {}), new Date()]
  );
}

async function getLicensedProduct(productSlug, activationKey) {
  const db = getDb();

  const [productRows] = await db.query('SELECT id, name, slug FROM products WHERE slug = ? AND is_active = 1 LIMIT 1', [
    productSlug
  ]);
  if (productRows.length === 0) {
    return { error: 'Product not found', code: 404 };
  }

  const product = productRows[0];
  const [licenseRows] = await db.query(
    'SELECT * FROM licenses WHERE activation_key = ? AND product_id = ? LIMIT 1',
    [String(activationKey).trim().toUpperCase(), product.id]
  );

  if (licenseRows.length === 0) {
    return { error: 'No valid purchase found for this product', code: 403 };
  }

  const license = licenseRows[0];
  if (new Date(license.end_date) < new Date()) {
    return { error: 'License expired. Renew to download updates.', code: 403 };
  }

  const [assetRows] = await db.query('SELECT * FROM product_assets WHERE product_id = ? LIMIT 1', [product.id]);
  if (assetRows.length === 0) {
    return { error: 'Product file is not uploaded yet', code: 404 };
  }

  return { product, license, asset: assetRows[0] };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'saas-fresh-platform-backend-mysql' });
});

app.post('/api/auth/register', async (req, res) => {
  const { fullName = '', email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const db = getDb();
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already exists for this email' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    await db.query('INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)', [
      id,
      email.trim().toLowerCase(),
      fullName.trim() || null,
      passwordHash,
      new Date()
    ]);

    const token = signCustomerToken({ id, email: email.trim().toLowerCase() });
    return res.status(201).json({
      token,
      user: { id, email: email.trim().toLowerCase(), fullName: fullName.trim() }
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const db = getDb();
    const [rows] = await db.query('SELECT id, email, full_name, password_hash FROM users WHERE email = ? LIMIT 1', [
      email.trim().toLowerCase()
    ]);
    if (rows.length === 0 || !rows[0].password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signCustomerToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name || ''
      }
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const db = getDb();
    const [rows] = await db.query(
      'SELECT id, email, password_hash, role, is_active FROM admin_users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    if (!admin.is_active) {
      return res.status(403).json({ error: 'Admin account is inactive' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAdminToken(admin);
    return res.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
  } catch (_error) {
    return res.status(500).json({ error: 'Admin login failed' });
  }
});

app.get('/api/store/products', async (_req, res) => {
  try {
    const db = getDb();
    const [products] = await db.query(
      `SELECT p.id, p.name, p.slug, p.price_usd, p.description, p.runtime_type,
              CASE WHEN pa.id IS NULL THEN 0 ELSE 1 END AS has_asset
       FROM products p
       LEFT JOIN product_assets pa ON pa.product_id = p.id
       WHERE p.is_active = 1
       ORDER BY p.created_at DESC`
    );
    res.json({ products });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

app.post('/api/store/purchase', async (req, res) => {
  const { email, productSlug } = req.body;
  if (!productSlug) {
    return res.status(400).json({ error: 'productSlug is required' });
  }

  try {
    const db = getDb();
    const [productRows] = await db.query('SELECT id, price_usd FROM products WHERE slug = ? AND is_active = 1 LIMIT 1', [
      productSlug
    ]);

    if (productRows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productRows[0];
    const customer = getOptionalCustomer(req);
    let user;

    if (customer) {
      const [userRows] = await db.query('SELECT id, email FROM users WHERE id = ? LIMIT 1', [customer.userId]);
      if (userRows.length === 0) {
        return res.status(401).json({ error: 'Customer account not found' });
      }
      user = userRows[0];
    } else {
      if (!email) {
        return res.status(400).json({ error: 'email is required when not logged in' });
      }
      const [userRows] = await db.query('SELECT id, email FROM users WHERE email = ? LIMIT 1', [email]);
      user = userRows[0];
      if (!user) {
        user = { id: uuidv4(), email };
        await db.query('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)', [user.id, email, new Date()]);
      }
    }

    const paymentId = uuidv4();
    await db.query(
      'INSERT INTO payments (id, user_id, product_id, amount_usd, provider_ref, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [paymentId, user.id, product.id, product.price_usd, `manual-${paymentId.slice(0, 8)}`, 'paid', new Date()]
    );

    const licenseId = uuidv4();
    const activationKey = generateActivationKey();
    const startDate = nowIso();
    const endDate = addDays(startDate, 30);

    await db.query(
      `INSERT INTO licenses
        (id, user_id, product_id, activation_key, device_id, status, start_date, end_date, last_check_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        licenseId,
        user.id,
        product.id,
        activationKey,
        null,
        'unused',
        new Date(startDate),
        new Date(endDate),
        null,
        new Date(),
        new Date()
      ]
    );

    await createEvent(licenseId, 'PURCHASED', { userId: user.id, paymentId, productId: product.id });

    return res.status(201).json({ message: 'Purchase created', activationKey, licenseId, expiresAt: endDate });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to create purchase' });
  }
});

app.get('/api/store/customer-licenses', async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    const db = getDb();
    const [rows] = await db.query(
      `SELECT p.name AS product_name, p.slug AS product_slug, l.activation_key, l.status, l.end_date
       FROM licenses l
       INNER JOIN users u ON u.id = l.user_id
       INNER JOIN products p ON p.id = l.product_id
       WHERE u.email = ?
       ORDER BY l.created_at DESC`,
      [email]
    );

    return res.json({ licenses: rows });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load customer licenses' });
  }
});

app.get('/api/customer/licenses', requireCustomerAuth, async (req, res) => {
  try {
    const db = getDb();
    const [rows] = await db.query(
      `SELECT p.name AS product_name, p.slug AS product_slug, l.activation_key, l.status, l.end_date,
              CASE WHEN pa.id IS NULL THEN 0 ELSE 1 END AS has_asset
       FROM licenses l
       INNER JOIN products p ON p.id = l.product_id
       LEFT JOIN product_assets pa ON pa.product_id = p.id
       WHERE l.user_id = ?
       ORDER BY l.created_at DESC`,
      [req.customer.userId]
    );
    return res.json({ licenses: rows });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load customer licenses' });
  }
});

app.get('/api/customer/download/:productSlug', requireCustomerAuth, async (req, res) => {
  const { productSlug } = req.params;
  try {
    const db = getDb();
    const [productRows] = await db.query('SELECT id FROM products WHERE slug = ? AND is_active = 1 LIMIT 1', [
      productSlug
    ]);
    if (productRows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productRows[0];
    const [licenseRows] = await db.query(
      'SELECT * FROM licenses WHERE user_id = ? AND product_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.customer.userId, product.id]
    );
    if (licenseRows.length === 0) {
      return res.status(403).json({ error: 'No purchase found for this account' });
    }

    const license = licenseRows[0];
    if (new Date(license.end_date) < new Date()) {
      return res.status(403).json({ error: 'License expired. Renew to download updates.' });
    }

    const [assetRows] = await db.query('SELECT * FROM product_assets WHERE product_id = ? LIMIT 1', [product.id]);
    if (assetRows.length === 0) {
      return res.status(404).json({ error: 'Product asset is not uploaded yet' });
    }

    const asset = assetRows[0];
    await createEvent(license.id, 'DOWNLOAD_GRANTED_CUSTOMER', {
      productSlug,
      requestedAt: nowIso(),
      byUserId: req.customer.userId
    });

    return res.download(asset.file_path, asset.original_name);
  } catch (_error) {
    return res.status(500).json({ error: 'File download failed' });
  }
});

app.post('/api/licenses/activate', async (req, res) => {
  const { activationKey, deviceId } = req.body;
  if (!activationKey || !deviceId) {
    return res.status(400).json({ error: 'activationKey and deviceId are required' });
  }

  try {
    const db = getDb();
    const normalizedKey = activationKey.trim().toUpperCase();
    const [licenseRows] = await db.query('SELECT * FROM licenses WHERE activation_key = ? LIMIT 1', [normalizedKey]);

    if (licenseRows.length === 0) {
      return res.status(404).json({ error: 'Invalid activation key' });
    }

    const license = licenseRows[0];
    const now = nowIso();

    if (license.status === 'expired' || new Date(license.end_date) < new Date(now)) {
      await db.query('UPDATE licenses SET status = ?, updated_at = ? WHERE id = ?', ['expired', new Date(), license.id]);
      return res.status(403).json({ error: 'License expired. Please renew.' });
    }

    if (license.device_id && license.device_id !== deviceId) {
      await createEvent(license.id, 'ACTIVATION_BLOCKED_DEVICE_MISMATCH', {
        currentDevice: deviceId,
        boundDevice: license.device_id
      });
      return res.status(403).json({ error: 'Key is already registered on another PC' });
    }

    await db.query('UPDATE licenses SET device_id = ?, status = ?, last_check_at = ?, updated_at = ? WHERE id = ?', [
      deviceId,
      'active',
      new Date(),
      new Date(),
      license.id
    ]);

    const runtimeToken = signRuntimeToken({
      licenseId: license.id,
      userId: license.user_id,
      productId: license.product_id,
      deviceId,
      endDate: new Date(license.end_date).toISOString()
    });

    await createEvent(license.id, 'ACTIVATED', { deviceId });

    return res.json({
      message: 'Activation successful',
      runtimeToken,
      expiresAt: new Date(license.end_date).toISOString(),
      recheckInDays: 4
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Activation failed' });
  }
});

app.post('/api/licenses/validate', async (req, res) => {
  const { activationKey, deviceId } = req.body;
  if (!activationKey || !deviceId) {
    return res.status(400).json({ error: 'activationKey and deviceId are required' });
  }

  try {
    const db = getDb();
    const normalizedKey = activationKey.trim().toUpperCase();
    const [licenseRows] = await db.query('SELECT * FROM licenses WHERE activation_key = ? LIMIT 1', [normalizedKey]);

    if (licenseRows.length === 0) {
      return res.status(404).json({ error: 'Invalid activation key' });
    }

    const license = licenseRows[0];

    if (license.device_id !== deviceId) {
      await createEvent(license.id, 'VALIDATION_BLOCKED_DEVICE_MISMATCH', {
        currentDevice: deviceId,
        boundDevice: license.device_id
      });
      return res.status(403).json({ error: 'License is bound to another device', shouldLock: true });
    }

    const now = nowIso();
    if (new Date(license.end_date) < new Date(now)) {
      await db.query('UPDATE licenses SET status = ?, last_check_at = ?, updated_at = ? WHERE id = ?', [
        'expired',
        new Date(),
        new Date(),
        license.id
      ]);

      await createEvent(license.id, 'EXPIRED', { checkedAt: now });

      return res.status(403).json({
        error: 'License expired',
        shouldLock: true,
        renewUrl: 'https://your-store.example.com/renew'
      });
    }

    await db.query('UPDATE licenses SET status = ?, last_check_at = ?, updated_at = ? WHERE id = ?', [
      'active',
      new Date(),
      new Date(),
      license.id
    ]);

    const runtimeToken = signRuntimeToken({
      licenseId: license.id,
      userId: license.user_id,
      productId: license.product_id,
      deviceId,
      endDate: new Date(license.end_date).toISOString()
    });

    await createEvent(license.id, 'VALIDATED', { checkedAt: now });

    return res.json({
      active: true,
      shouldLock: false,
      expiresAt: new Date(license.end_date).toISOString(),
      runtimeToken,
      nextCheckDays: 4
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Validation failed' });
  }
});

app.post('/api/licenses/renew', requireAdminAuth, async (req, res) => {
  const { activationKey, days = 30 } = req.body;
  if (!activationKey) {
    return res.status(400).json({ error: 'activationKey is required' });
  }

  try {
    const db = getDb();
    const normalizedKey = activationKey.trim().toUpperCase();
    const [licenseRows] = await db.query('SELECT * FROM licenses WHERE activation_key = ? LIMIT 1', [normalizedKey]);

    if (licenseRows.length === 0) {
      return res.status(404).json({ error: 'License not found' });
    }

    const license = licenseRows[0];
    const baseDate = new Date(license.end_date) > new Date() ? license.end_date : nowIso();
    const newEndDate = addDays(baseDate, Number(days));

    await db.query('UPDATE licenses SET end_date = ?, status = ?, updated_at = ? WHERE id = ?', [
      new Date(newEndDate),
      'active',
      new Date(),
      license.id
    ]);

    await createEvent(license.id, 'RENEWED', {
      days,
      oldEndDate: new Date(license.end_date).toISOString(),
      newEndDate
    });

    return res.json({ message: 'License renewed', activationKey: license.activation_key, newEndDate });
  } catch (_error) {
    return res.status(500).json({ error: 'Renew failed' });
  }
});

app.get('/api/store/download/:productSlug', async (req, res) => {
  const { productSlug } = req.params;
  const { activationKey } = req.query;

  if (!activationKey) {
    return res.status(400).json({ error: 'activationKey is required' });
  }

  try {
    const result = await getLicensedProduct(productSlug, activationKey);
    if (result.error) {
      return res.status(result.code).json({ error: result.error });
    }

    return res.json({
      downloadAllowed: true,
      fileName: result.asset.original_name,
      downloadUrl: `/api/store/download/${encodeURIComponent(productSlug)}/file?activationKey=${encodeURIComponent(
        String(activationKey).trim().toUpperCase()
      )}`
    });
  } catch (_error) {
    return res.status(500).json({ error: 'Download check failed' });
  }
});

app.get('/api/store/download/:productSlug/file', async (req, res) => {
  const { productSlug } = req.params;
  const { activationKey } = req.query;

  if (!activationKey) {
    return res.status(400).json({ error: 'activationKey is required' });
  }

  try {
    const result = await getLicensedProduct(productSlug, activationKey);
    if (result.error) {
      return res.status(result.code).json({ error: result.error });
    }

    await createEvent(result.license.id, 'DOWNLOAD_GRANTED', {
      productSlug,
      fileName: result.asset.original_name,
      requestedAt: nowIso()
    });

    return res.download(result.asset.file_path, result.asset.original_name);
  } catch (_error) {
    return res.status(500).json({ error: 'File download failed' });
  }
});

app.get('/api/admin/overview', requireAdminAuth, async (_req, res) => {
  try {
    const db = getDb();
    const [[counts]] = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM users) AS total_users,
         (SELECT COUNT(*) FROM licenses) AS total_licenses,
         (SELECT COUNT(*) FROM licenses WHERE status = 'active') AS active_licenses,
         (SELECT COUNT(*) FROM licenses WHERE status = 'expired') AS expired_licenses,
         (SELECT COALESCE(SUM(amount_usd), 0) FROM payments WHERE status = 'paid') AS revenue_usd,
         (SELECT COUNT(*) FROM products WHERE is_active = 1) AS active_products`
    );

    return res.json({ overview: counts });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load admin overview' });
  }
});

app.get('/api/admin/licenses', requireAdminAuth, async (_req, res) => {
  try {
    const db = getDb();
    const [licenses] = await db.query(
      `SELECT l.id, l.activation_key, l.device_id, l.status, l.end_date, u.email, p.name AS product_name
       FROM licenses l
       INNER JOIN users u ON u.id = l.user_id
       INNER JOIN products p ON p.id = l.product_id
       ORDER BY l.created_at DESC`
    );

    return res.json({ licenses });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load licenses' });
  }
});

app.get('/api/admin/products', requireAdminAuth, async (_req, res) => {
  try {
    const db = getDb();
    const [products] = await db.query(
      `SELECT p.id, p.name, p.slug, p.price_usd, p.description, p.runtime_type, p.is_active,
              pa.original_name AS asset_name, pa.file_size AS asset_size, pa.updated_at AS asset_updated_at
       FROM products p
       LEFT JOIN product_assets pa ON pa.product_id = p.id
       ORDER BY p.created_at DESC`
    );

    return res.json({ products });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to load products' });
  }
});

app.post('/api/admin/products', requireAdminAuth, async (req, res) => {
  const { name, slug, priceUsd, description = '', runtimeType = 'python' } = req.body;
  if (!name || !slug || !Number.isFinite(Number(priceUsd))) {
    return res.status(400).json({ error: 'name, slug and priceUsd are required' });
  }

  try {
    const db = getDb();
    const id = uuidv4();
    await db.query(
      `INSERT INTO products (id, name, slug, price_usd, description, runtime_type, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [id, name.trim(), slug.trim().toLowerCase(), Number(priceUsd), description, runtimeType, new Date()]
    );

    return res.status(201).json({ message: 'Product created', id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Product slug already exists' });
    }
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

app.post('/api/admin/products/:productId/asset', requireAdminAuth, upload.single('asset'), async (req, res) => {
  const { productId } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'asset file is required' });
  }

  try {
    const db = getDb();
    const [products] = await db.query('SELECT id FROM products WHERE id = ? LIMIT 1', [productId]);
    if (products.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Product not found' });
    }

    const [existingAssets] = await db.query('SELECT id, file_path FROM product_assets WHERE product_id = ? LIMIT 1', [productId]);

    if (existingAssets.length === 0) {
      await db.query(
        `INSERT INTO product_assets
         (id, product_id, original_name, stored_name, mime_type, file_size, file_path, checksum_sha256, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          productId,
          req.file.originalname,
          req.file.filename,
          req.file.mimetype || 'application/octet-stream',
          req.file.size,
          req.file.path,
          null,
          new Date(),
          new Date()
        ]
      );
    } else {
      const oldPath = existingAssets[0].file_path;
      await db.query(
        `UPDATE product_assets
         SET original_name = ?, stored_name = ?, mime_type = ?, file_size = ?, file_path = ?, updated_at = ?
         WHERE product_id = ?`,
        [
          req.file.originalname,
          req.file.filename,
          req.file.mimetype || 'application/octet-stream',
          req.file.size,
          req.file.path,
          new Date(),
          productId
        ]
      );

      if (oldPath && oldPath !== req.file.path) {
        fs.unlink(oldPath, () => {});
      }
    }

    return res.json({ message: 'Asset uploaded successfully', fileName: req.file.originalname, fileSize: req.file.size });
  } catch (_error) {
    fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: 'Asset upload failed' });
  }
});

(async () => {
  try {
    await initDb();
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize backend:', error.message || error);
    process.exit(1);
  }
})();
