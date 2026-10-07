const KEY = 'kitchenstock_token';

export const getToken = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

async function req(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const res = await fetch(`/api${path}`, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && path !== '/auth/login') onUnauthorized();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  login: (email, password) => req('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => req('/auth/me'),
  changePassword: (currentPassword, newPassword) => req('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  users: () => req('/users'),
  addUser: (body) => req('/users', { method: 'POST', body }),
  updateUser: (id, body) => req(`/users/${id}`, { method: 'PATCH', body }),
  deleteUser: (id) => req(`/users/${id}`, { method: 'DELETE' }),

  items: () => req('/items'),
  addItem: (body) => req('/items', { method: 'POST', body }),
  updateItem: (id, body) => req(`/items/${id}`, { method: 'PUT', body }),
  deleteItem: (id) => req(`/items/${id}`, { method: 'DELETE' }),
  categories: () => req('/categories'),
  shopping: () => req('/shopping'),
  addShopping: (body) => req('/shopping', { method: 'POST', body }),
  toggleShopping: (id, done) => req(`/shopping/${id}`, { method: 'PATCH', body: { done } }),
  deleteShopping: (id) => req(`/shopping/${id}`, { method: 'DELETE' }),
  exportData: () => req('/export'),
  importData: (body) => req('/import', { method: 'POST', body }),
};
