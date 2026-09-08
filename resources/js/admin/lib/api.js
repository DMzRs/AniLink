const BASE = '/api'

// URLSearchParams serializes undefined as the literal string "undefined",
// which the backend then filters on — drop empty params instead.
function qs(params = {}) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  return new URLSearchParams(clean)
}

function getToken() {
  return localStorage.getItem('anilink_admin_token')
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (!(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = getToken()
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
  me: () => apiFetch('/me'),
  verifications: (params = {}) => apiFetch(`/admin/verifications?${qs(params)}`),
  decide: (id, status, note) => apiFetch(`/admin/verifications/${id}/decision`, { method: 'POST', body: { status, note } }),
  listings: (params = {}) => apiFetch(`/admin/listings?${qs(params)}`),
  moderateListing: (id, status, note) => apiFetch(`/admin/listings/${id}`, { method: 'PATCH', body: { status, note } }),
  users: (params = {}) => apiFetch(`/admin/users?${qs(params)}`),
  moderateUser: (id, payload) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: payload }),
  analytics: () => apiFetch('/admin/analytics'),
  orders: (params = {}) => apiFetch(`/admin/orders?${qs(params)}`),
}
