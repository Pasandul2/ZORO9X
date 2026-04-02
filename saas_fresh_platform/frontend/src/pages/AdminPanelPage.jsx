import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import MetricCard from '../components/MetricCard';
import { api } from '../services/api';

function AdminPanelPage() {
  const token = localStorage.getItem('admin_token');
  const [overview, setOverview] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [renewForm, setRenewForm] = useState({ activationKey: '', days: 30 });
  const [productForm, setProductForm] = useState({
    name: '',
    slug: '',
    priceUsd: 0,
    runtimeType: 'python',
    description: ''
  });
  const [uploadState, setUploadState] = useState({ productId: '', file: null });

  async function refreshAdminData() {
    const [overviewResult, licensesResult, productsResult] = await Promise.all([
      api.adminOverview(),
      api.adminLicenses(),
      api.adminProducts()
    ]);
    setOverview(overviewResult.overview);
    setLicenses(licensesResult.licenses || []);
    setProducts(productsResult.products || []);
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    refreshAdminData()
      .catch((error) => {
        setMessage(error.message);
      });
  }, [token]);

  async function handleRenew(event) {
    event.preventDefault();
    setMessage('');
    try {
      const result = await api.renewLicense({
        activationKey: renewForm.activationKey,
        days: Number(renewForm.days)
      });
      setMessage(`Renew successful. New end date: ${result.newEndDate}`);
      await refreshAdminData();
      setRenewForm({ activationKey: '', days: 30 });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    setMessage('');
    try {
      await api.createProduct({
        ...productForm,
        slug: productForm.slug.trim().toLowerCase()
      });
      await refreshAdminData();
      setMessage('Product created. Now upload installer asset.');
      setProductForm({ name: '', slug: '', priceUsd: 0, runtimeType: 'python', description: '' });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleUploadAsset(event) {
    event.preventDefault();
    if (!uploadState.productId || !uploadState.file) {
      setMessage('Select product and file before upload.');
      return;
    }

    setMessage('');
    try {
      await api.uploadProductAsset(uploadState.productId, uploadState.file);
      await refreshAdminData();
      setMessage('Installer uploaded successfully.');
      setUploadState({ productId: '', file: null });
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <section className="panel">
      <h1>Admin Panel</h1>
      <p>Manage renewals, monitor licenses, and track SaaS revenue health.</p>

      {overview && (
        <div className="metrics-grid">
          <MetricCard label="Users" value={overview.total_users} />
          <MetricCard label="Total Licenses" value={overview.total_licenses} />
          <MetricCard label="Active Licenses" value={overview.active_licenses} />
          <MetricCard label="Expired Licenses" value={overview.expired_licenses} />
          <MetricCard label="Revenue (USD)" value={overview.revenue_usd} />
          <MetricCard label="Active Products" value={overview.active_products} />
        </div>
      )}

      <h2>Create Product</h2>
      <form onSubmit={handleCreateProduct} className="form-grid">
        <input
          type="text"
          required
          placeholder="Product name"
          value={productForm.name}
          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
        />
        <input
          type="text"
          required
          placeholder="Slug (example: inventory-pro)"
          value={productForm.slug}
          onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
        />
        <input
          type="number"
          required
          min="0"
          placeholder="Price in USD"
          value={productForm.priceUsd}
          onChange={(e) => setProductForm({ ...productForm, priceUsd: Number(e.target.value) })}
        />
        <select
          value={productForm.runtimeType}
          onChange={(e) => setProductForm({ ...productForm, runtimeType: e.target.value })}
        >
          <option value="python">Python</option>
          <option value="windows-exe">Windows EXE</option>
          <option value="macos-app">macOS App</option>
        </select>
        <input
          type="text"
          placeholder="Description"
          value={productForm.description}
          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
        />
        <button className="btn" type="submit">
          Create Product
        </button>
      </form>

      <h2>Upload Product Installer</h2>
      <form onSubmit={handleUploadAsset} className="form-grid">
        <select
          value={uploadState.productId}
          onChange={(e) => setUploadState({ ...uploadState, productId: e.target.value })}
          required
        >
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.slug})
            </option>
          ))}
        </select>
        <input
          type="file"
          required
          onChange={(e) => setUploadState({ ...uploadState, file: e.target.files?.[0] || null })}
        />
        <button className="btn" type="submit">
          Upload Asset
        </button>
      </form>

      <form onSubmit={handleRenew} className="form-inline">
        <input
          type="text"
          required
          placeholder="Activation key"
          value={renewForm.activationKey}
          onChange={(e) => setRenewForm({ ...renewForm, activationKey: e.target.value.toUpperCase() })}
        />
        <input
          type="number"
          min="1"
          value={renewForm.days}
          onChange={(e) => setRenewForm({ ...renewForm, days: e.target.value })}
        />
        <button className="btn" type="submit">
          Renew License
        </button>
      </form>

      {message && <p className="notice">{message}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Product</th>
              <th>Activation Key</th>
              <th>Device</th>
              <th>Status</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((license) => (
              <tr key={license.id}>
                <td>{license.email}</td>
                <td>{license.product_name}</td>
                <td>{license.activation_key}</td>
                <td>{license.device_id || 'Not activated'}</td>
                <td>{license.status}</td>
                <td>{new Date(license.end_date).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Products and Assets</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Runtime</th>
              <th>Price</th>
              <th>Asset</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.slug}</td>
                <td>{product.runtime_type}</td>
                <td>${product.price_usd}</td>
                <td>{product.asset_name || 'Not uploaded'}</td>
                <td>{product.asset_size || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminPanelPage;
