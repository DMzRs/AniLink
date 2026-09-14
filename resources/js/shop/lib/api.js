const BASE = '/api'

function qs(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  return new URLSearchParams(clean)
}

function getToken() {
  return localStorage.getItem('anilink_shop_token')
}

async function apiFetch(path, { method = 'GET', body, auth = true, token } = {}) {
  const headers = { Accept: 'application/json' }
  if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = token ?? getToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }
  if (!res.ok) {
    const err = new Error(json?.message || `API ${res.status}`)
    err.status = res.status
    err.data = json
    throw err
  }
  return json
}

export const api = {
  login: (email, password) => apiFetch('/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (payload) => apiFetch('/register', { method: 'POST', body: payload, auth: false }),
  // 2FA verify accepts a pending token or falls back to email-only lookup (backend supports both)
  verifyTwoFactor: (code, { email, pendingToken } = {}) =>
    apiFetch('/2fa/verify', {
      method: 'POST',
      body: pendingToken ? { code } : { code, email },
      auth: !!pendingToken,
      token: pendingToken,
    }),
  me: () => apiFetch('/me'),
  logout: () => apiFetch('/logout', { method: 'POST' }),

  products: (params = {}) => apiFetch(`/products?${qs(params)}`, { auth: false }),
  product: (id) => apiFetch(`/products/${id}`, { auth: false }),
  categories: () => apiFetch('/categories', { auth: false }),
  regions: () => apiFetch('/regions', { auth: false }),

  validateCart: (items, orderType) => apiFetch('/cart/validate', { method: 'POST', body: { items, order_type: orderType } }),
  createOrder: (payload) => apiFetch('/orders', { method: 'POST', body: payload }),
  orders: (params = {}) => apiFetch(`/orders?${qs(params)}`),
  updateOrderStatus: (id, status, note) => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status, note } }),
  reviewOrder: (id, payload) => apiFetch(`/orders/${id}/review`, { method: 'POST', body: payload }),

  farmerReviews: (farmerId) => apiFetch(`/farmers/${farmerId}/reviews`, { auth: false }),

  quotes: () => apiFetch('/quotes'),
  acceptQuote: (id, fulfillmentType) => apiFetch(`/quotes/${id}/accept`, { method: 'PATCH', body: { fulfillment_type: fulfillmentType } }),
  withdrawQuote: (id) => apiFetch(`/quotes/${id}/withdraw`, { method: 'PATCH' }),
  fileReport: (payload) => apiFetch('/reports', { method: 'POST', body: payload }),

  notifications: () => apiFetch('/notifications'),
  unreadCount: () => apiFetch('/notifications/unread-count'),
  markNotificationRead: (id) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
}
