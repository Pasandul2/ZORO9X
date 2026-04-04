import { useState } from 'react';
import { api } from '../services/api';

function CustomerDashboardPage() {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ fullName: '', email: '', password: '' });
  const [customer, setCustomer] = useState(() => {
    const email = localStorage.getItem('customer_email') || '';
    const token = localStorage.getItem('customer_token') || '';
    return token ? { email } : null;
  });
  const [licenses, setLicenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadProducts() {
    try {
      const result = await api.getProducts();
      setProducts(result.products || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadLicenses(event) {
    if (event) {
      event.preventDefault();
    }
    setError('');
    try {
      const result = await api.customerMyLicenses();
      setLicenses(result.licenses || []);
    } catch (err) {
      setError(err.message);
      setLicenses([]);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const payload = {
        email: authForm.email,
        password: authForm.password
      };
      const result =
        authMode === 'register'
          ? await api.customerRegister({ ...payload, fullName: authForm.fullName })
          : await api.customerLogin(payload);

      localStorage.setItem('customer_token', result.token);
      localStorage.setItem('customer_email', result.user.email);
      setCustomer({ email: result.user.email });
      setMessage(authMode === 'register' ? 'Account created successfully.' : 'Login successful.');
      await loadProducts();
      await loadLicenses();
    } catch (err) {
      setError(err.message);
    }
  }

  function logoutCustomer() {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_email');
    setCustomer(null);
    setLicenses([]);
    setProducts([]);
    setMessage('');
  }

  async function purchaseProduct(productSlug) {
    setError('');
    setMessage('');
    try {
      const result = await api.purchase({ productSlug });
      setMessage(`Purchase successful. Activation key: ${result.activationKey}`);
      await loadLicenses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadProduct(license) {
    try {
      const token = localStorage.getItem('customer_token') || '';
      const url = api.customerDownloadUrl(license.product_slug);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Download failed');
      }

      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = fileUrl;
      anchor.download = `${license.product_slug}`;
      anchor.click();
      window.URL.revokeObjectURL(fileUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <h1>Customer Dashboard</h1>
      <p>Step flow: create account, login, buy project, view licenses, then download verified software.</p>

      {!customer && (
        <>
          <div className="form-inline">
            <button className="btn" type="button" onClick={() => setAuthMode('login')}>
              Login
            </button>
            <button className="btn" type="button" onClick={() => setAuthMode('register')}>
              Register
            </button>
          </div>

          <form onSubmit={handleAuth} className="form-grid">
            {authMode === 'register' && (
              <input
                type="text"
                placeholder="Full name"
                value={authForm.fullName}
                onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
              />
            )}
            <input
              type="email"
              required
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
            />
            <button className="btn" type="submit">
              {authMode === 'register' ? 'Create Account' : 'Login'}
            </button>
          </form>
        </>
      )}

      {customer && (
        <div className="form-inline">
          <p>Logged in as: {customer.email}</p>
          <button className="btn" type="button" onClick={loadProducts}>
            Load Projects
          </button>
          <button className="btn" type="button" onClick={logoutCustomer}>
            Logout
          </button>
        </div>
      )}

      <form onSubmit={loadLicenses} className="form-grid">
        <button className="btn" type="button" onClick={loadProducts}>
          1. Load Available Projects
        </button>
        <button className="btn" type="submit">
          2. Load My Purchased Projects
        </button>
      </form>

      {message && <p className="notice">{message}</p>}

      {error && <p className="error">{error}</p>}

      <h2>Available Projects</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Price</th>
              <th>Runtime</th>
              <th>Asset</th>
              <th>Buy</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>${product.price_usd}</td>
                <td>{product.runtime_type || '-'}</td>
                <td>{Number(product.has_asset) === 1 ? 'Ready' : 'Not uploaded'}</td>
                <td>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => purchaseProduct(product.slug)}
                    disabled={!customer || Number(product.has_asset) !== 1}
                  >
                    Buy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>My Purchased Projects</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Activation Key</th>
              <th>Status</th>
              <th>End Date</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((license) => (
              <tr key={`${license.activation_key}-${license.product_slug}`}>
                <td>{license.product_name}</td>
                <td>{license.activation_key}</td>
                <td>{license.status}</td>
                <td>{new Date(license.end_date).toLocaleString()}</td>
                <td>
                  <button className="btn" type="button" onClick={() => downloadProduct(license)}>
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default CustomerDashboardPage;
