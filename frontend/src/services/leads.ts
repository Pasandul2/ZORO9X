const API_URL = import.meta.env.VITE_API_URL || '';

function getAdminToken() {
  return localStorage.getItem('adminToken') || '';
}

export async function fetchLeads(filters?: Record<string, any>) {
  const token = getAdminToken();
  const safeEntries = filters
    ? Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    : [];
  const qs = safeEntries.length
    ? '?' + safeEntries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : '';
  const res = await fetch(`${API_URL}/api/admin/leads${qs}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function fetchLead(id: number) {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}/api/admin/leads/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export async function createLead(payload: FormData) {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}/api/admin/leads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: payload
  });
  return res.json();
}

export async function updateLead(id: number, payload: FormData) {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}/api/admin/leads/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: payload
  });
  return res.json();
}

export async function deleteLead(id: number) {
  const token = getAdminToken();
  const res = await fetch(`${API_URL}/api/admin/leads/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

export default { fetchLeads, fetchLead, createLead, updateLead, deleteLead };
