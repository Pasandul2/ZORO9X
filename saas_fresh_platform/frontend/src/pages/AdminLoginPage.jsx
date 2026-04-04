import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

function AdminLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: 'admin@saasfresh.local', password: 'ChangeThisAdminPassword' });

  async function onSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const result = await api.adminLogin(form);
      localStorage.setItem('admin_token', result.token);
      localStorage.setItem('admin_email', result.admin.email);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel narrow">
      <h1>Admin Login</h1>
      <p>Sign in to access SaaS operational controls.</p>

      <form onSubmit={onSubmit} className="form-grid">
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button className="btn" type="submit">
          Login
        </button>
      </form>

      {error && <p className="error">{error}</p>}
    </section>
  );
}

export default AdminLoginPage;
