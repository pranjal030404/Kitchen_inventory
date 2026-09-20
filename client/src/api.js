async function req(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
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
