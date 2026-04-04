import { useEffect, useState } from 'react';
import { api } from '../services/api';

function StorePage() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ email: '', productSlug: 'simple-inventory' });

  useEffect(() => {
    api.getProducts().then((result) => setProducts(result.products || [])).catch(() => setProducts([]));
  }, []);

  async function onPurchase(event) {
    event.preventDefault();
    setMessage('');
    try {
      const result = await api.purchase(form);
      setMessage(`Purchase successful. Activation key: ${result.activationKey}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel">
      <h1>Store</h1>
      <p>Buy software plans and receive activation keys instantly.</p>

      <form onSubmit={onPurchase} className="form-grid">
        <input
          type="email"
          required
          placeholder="Customer email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select value={form.productSlug} onChange={(e) => setForm({ ...form, productSlug: e.target.value })}>
          {products.map((product) => (
            <option key={product.id} value={product.slug}>
              {product.name} (${product.price_usd})
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Purchase and Generate Key
        </button>
      </form>

      {message && <p className="notice">{message}</p>}
    </section>
  );
}

export default StorePage;
