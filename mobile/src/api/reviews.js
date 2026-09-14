import { api } from './client';

export async function submitReview(orderId, { rating, comment }) {
  return api.request(`/orders/${orderId}/review`, { method: 'POST', body: { rating, comment }, auth: true });
}

export async function getFarmerReviews(farmerId) {
  return api.request(`/farmers/${farmerId}/reviews`);
}
