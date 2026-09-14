const BASE = '/api'

// URLSearchParams serializes undefined as the literal string "undefined",
// which the backend then filters on — drop empty params instead.
function qs(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  return new URLSearchParams(clean)
}

function getToken() {
  return localStorage.getItem('anilink_manage_token')
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
  verifyTwoFactor: (code, { email, pendingToken } = {}) =>
    apiFetch('/2fa/verify', {
      method: 'POST',
      body: pendingToken ? { code } : { code, email },
      auth: !!pendingToken,
      token: pendingToken,
    }),
  me: () => apiFetch('/me'),
  farmerProducts: (params = {}) => apiFetch(`/farmer/products?${qs(params)}`),
  dashboard: () => apiFetch('/farmer/dashboard'),
  insights: () => apiFetch('/predict/insights'),
  farmerQuotes: () => apiFetch('/farmer/quotes'),
  respondQuote: (id, payload) => apiFetch(`/farmer/quotes/${id}`, { method: 'PATCH', body: payload }),
  adjustStock: (id, changeAmount, reason = 'adjustment') => apiFetch(`/products/${id}/stock`, { method: 'PATCH', body: { change_amount: changeAmount, reason } }),
  updateProduct: (id, payload) => apiFetch(`/products/${id}`, { method: 'PUT', body: payload }),
  createProduct: (payload) => {
    const isForm = payload instanceof FormData
    return apiFetch('/products', { method: 'POST', body: payload, auth: true })
  },
  categories: () => apiFetch('/categories', { auth: false }),
  orders: (params = {}) => apiFetch(`/orders?${qs(params)}`),
  updateOrderStatus: (id, status, note) => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status, note } }),
}
