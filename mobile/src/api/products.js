import { api } from './client';

export async function getCategories() {
  return api.request('/categories');
}

export async function getProducts(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') q.set(k, String(v));
  });
  const qs = q.toString() ? `?${q.toString()}` : '';
  const json = await api.request(`/products${qs}`);
  // Laravel paginated shape: {data:[], total, per_page...}
  if (Array.isArray(json)) return { data: json };
  if (json?.data && Array.isArray(json.data)) return json;
  return { data: json.data ?? [] };
}

export async function getProduct(id) {
  const json = await api.request(`/products/${id}`);
  return json.data ?? json;
}

export async function validateCart(items, orderType = 'retail') {
  return api.request('/cart/validate', { method: 'POST', body: { items, order_type: orderType }, auth: true });
}
