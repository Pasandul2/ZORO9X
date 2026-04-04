const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4500';

function getAdminToken() {
  return localStorage.getItem('admin_token') || '';
}

function getCustomerToken() {
  return localStorage.getItem('customer_token') || '';
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const mergedHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: mergedHeaders
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  customerRegister: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  customerLogin: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getProducts: () => request('/api/store/products'),
  purchase: (payload) =>
    request('/api/store/purchase', {
      method: 'POST',
      headers: getCustomerToken() ? { Authorization: `Bearer ${getCustomerToken()}` } : {},
      body: JSON.stringify(payload)
    }),
  customerLicenses: (email) => request(`/api/store/customer-licenses?email=${encodeURIComponent(email)}`),
  customerMyLicenses: () =>
    request('/api/customer/licenses', {
      headers: { Authorization: `Bearer ${getCustomerToken()}` }
    }),
  customerDownloadUrl: (productSlug) => `${API_BASE}/api/customer/download/${encodeURIComponent(productSlug)}`,
  adminLogin: (payload) => request('/api/admin/login', { method: 'POST', body: JSON.stringify(payload) }),
  adminOverview: () =>
    request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    }),
  adminLicenses: () =>
    request('/api/admin/licenses', {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    }),
  adminProducts: () =>
    request('/api/admin/products', {
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    }),
  createProduct: (payload) =>
    request('/api/admin/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(payload)
    }),
  uploadProductAsset: (productId, file) => {
    const formData = new FormData();
    formData.append('asset', file);
    return request(`/api/admin/products/${productId}/asset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAdminToken()}` },
      body: formData
    });
  },
  getDownloadAccess: async (productSlug, activationKey) => {
    const result = await request(
      `/api/store/download/${encodeURIComponent(productSlug)}?activationKey=${encodeURIComponent(
        activationKey
      )}`
    );
    return {
      ...result,
      absoluteDownloadUrl: `${API_BASE}${result.downloadUrl}`
    };
  },
  renewLicense: (payload) =>
    request('/api/licenses/renew', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getAdminToken()}` },
      body: JSON.stringify(payload)
    })
};
