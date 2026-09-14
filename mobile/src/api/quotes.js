import { api } from './client';

// One-round bulk quote negotiation (B2B): request → farmer quotes/declines → accept/withdraw.
export async function getMyQuotes() {
  return api.request('/quotes', { auth: true });
}

export async function requestQuote(productId, quantity, message) {
  return api.request('/quotes', { method: 'POST', body: { product_id: productId, quantity, message }, auth: true });
}

export async function getFarmerQuotes() {
  return api.request('/farmer/quotes', { auth: true });
}

export async function respondToQuote(quoteId, payload) {
  return api.request(`/farmer/quotes/${quoteId}`, { method: 'PATCH', body: payload, auth: true });
}

export async function acceptQuote(quoteId, fulfillmentType) {
  return api.request(`/quotes/${quoteId}/accept`, { method: 'PATCH', body: { fulfillment_type: fulfillmentType }, auth: true });
}

export async function withdrawQuote(quoteId) {
  return api.request(`/quotes/${quoteId}/withdraw`, { method: 'PATCH', auth: true });
}
