import { api } from './client';

export async function createOrder({ items, orderType, fulfillmentType, deliveryAddress }) {
  // items: [{product_id, quantity}]
  const body = {
    items: items.map((i) => ({ product_id: i.product.id ?? i.product_id, quantity: i.qty ?? i.quantity })),
    order_type: orderType,
    fulfillment_type: fulfillmentType,
    delivery_address: deliveryAddress,
  };
  return api.request('/orders', { method: 'POST', body, auth: true });
}

export async function getOrders() {
  return api.request('/orders', { auth: true });
}

export async function getOrder(id) {
  return api.request(`/orders/${id}`, { auth: true });
}
