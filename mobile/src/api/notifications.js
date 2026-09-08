import { api } from './client';

export async function registerPushToken(expoPushToken, platform) {
  return api.request('/push-token', { method: 'POST', body: { expo_push_token: expoPushToken, platform }, auth: true });
}

export async function removePushToken() {
  return api.request('/push-token', { method: 'DELETE', auth: true });
}

export async function getNotifications() {
  const json = await api.request('/notifications', { auth: true });
  // backend returns {notifications: [...]}
  return json.notifications ?? json.data ?? json ?? [];
}

export async function getUnreadCount() {
  const json = await api.request('/notifications/unread-count', { auth: true });
  return json.count ?? 0;
}

export async function markRead(notificationId) {
  return api.request(`/notifications/${notificationId}/read`, { method: 'PATCH', auth: true });
}
