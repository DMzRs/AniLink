import { api } from './client';

// GET /api/predict/insights — AniPredict for the farmer (defaults to their first category)
export async function getInsights(categoryId) {
  const query = categoryId ? `?category_id=${categoryId}` : '';
  return api.request(`/predict/insights${query}`, { auth: true });
}
