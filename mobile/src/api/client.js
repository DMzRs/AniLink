import { API_URL } from './config';

// Simple token holder — in production use expo-secure-store. For offline queuing per spec, add queue here later.
let authToken = null;
export const setAuthToken = (t) => { authToken = t; };
export const getAuthToken = () => authToken;

async function request(path, { method = 'GET', body, headers = {}, auth = false } = {}) {
  const url = `${API_URL}${path}`;
  const isForm = body instanceof FormData;
  const h = { Accept: 'application/json', ...headers };
  if (!isForm) h['Content-Type'] = 'application/json';
  if (auth && authToken) h.Authorization = `Bearer ${authToken}`;

  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }

  if (!res.ok) {
    const err = new Error(json?.message || `API ${res.status}`);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

export const api = { request, setAuthToken, getAuthToken };
