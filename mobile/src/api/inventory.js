import { api } from './client';

export async function getFarmerProducts() {
  const json = await api.request('/farmer/products', { auth: true });
  // paginated
  return json.data ?? json ?? [];
}

export async function adjustStock(productId, changeAmount, reason = 'adjustment') {
  return api.request(`/products/${productId}/stock`, {
    method: 'PATCH',
    body: { change_amount: changeAmount, reason },
    auth: true,
  });
}

export async function updateProduct(productId, payload) {
  return api.request(`/products/${productId}`, { method: 'PUT', body: payload, auth: true });
}

export async function markSoldOut(productId) {
  return updateProduct(productId, { status: 'sold_out' });
}

export async function restockProduct(productId, qty = 10) {
  return adjustStock(productId, qty, 'restock');
}
