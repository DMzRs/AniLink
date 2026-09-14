import { api } from './client';

// Any signed-in user can report an order dispute or user misconduct.
export async function fileReport(payload) {
  return api.request('/reports', { method: 'POST', body: payload, auth: true });
}
