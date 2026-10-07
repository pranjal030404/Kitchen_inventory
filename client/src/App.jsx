import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';
import Login from './components/Login.jsx';
import Users from './components/Users.jsx';
import PasswordModal from './components/PasswordModal.jsx';
import Dashboard from './components/Dashboard.jsx';
import Inventory from './components/Inventory.jsx';
import Shopping from './components/Shopping.jsx';
import Categories from './components/Categories.jsx';
import ItemModal from './components/ItemModal.jsx';

const NAV = [
  ['dashboard', '▦', 'Dashboard'],
  ['inventory', '📦', 'Inventory'],
  ['shopping', '🛒', 'Shopping List'],
  ['categories', '◈', 'Categories'],
];

const TITLES = {
  dashboard: ['Good evening 👋', 'Keep your ingredients fresh and your pantry ready.'],
  inventory: ['Inventory', 'Track every ingredient, quantity, and expiry date.'],
  shopping: ['Shopping List', 'Never run out of the essentials.'],
  categories: ['Categories', 'A clear view of your kitchen stock.'],
  users: ['Users', 'Manage who can access KitchenStock.'],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (getToken()) api.me().then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true));
  }, [logout]);

  if (!ready) return <div className="empty">Loading…</div>;
  if (!user) return <Login onLogin={setUser} />;
  return <Shell user={user} onLogout={logout} />;
}

function Shell({ user, onLogout }) {
  const [page, setPage] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pwOpen, setPwOpen] = useState(false);
  const [modal, setModal] = useState(null); // null | {item?: object}
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef();
  const toastTimer = useRef();

  const notify = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const load = useCallback(async () => {
    try {
      const [i, s, c] = await Promise.all([api.items(), api.shopping(), api.categories()]);
      setItems(i);
      setShopping(s);
      setCategories(c.list);
      setError('');
    } catch (e) {
      setError(`Cannot reach the server: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Runs an API action, then refreshes data and shows feedback.
  const act = async (fn, okMsg) => {
    try {
      await fn();
      await load();
      if (okMsg) notify(okMsg);
      return true;
    } catch (e) {
      notify(e.message);
      return false;
    }
  };

  const saveItem = async (data, id) => {
    const ok = await act(() => (id ? api.updateItem(id, data) : api.addItem(data)), id ? 'Item updated' : 'Item added');
    if (ok) setModal(null);
    return ok;
  };

  const deleteItem = (item) => {
    if (window.confirm(`Delete "${item.name}" from inventory?`)) act(() => api.deleteItem(item.id), 'Item deleted');
  };

  const exportData = async () => {
    try {
      const data = await api.exportData();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = 'kitchenstock-backup.json';
      a.click();
      URL.revokeObjectURL(a.href);
      notify('Backup exported');
    } catch (e) {
      notify(e.message);
    }
  };

  const importData = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let data;
      try {
        data = JSON.parse(reader.result);
        if (!Array.isArray(data.items)) throw new Error();
      } catch {
        return window.alert('Invalid KitchenStock backup file.');
      }
      if (window.confirm('Importing replaces ALL current inventory and shopping data. Continue?'))
        act(() => api.importData(data), 'Backup imported');
    };
    reader.readAsText(file);
  };

  const go = (p) => {
    setPage(p);
    setMenuOpen(false);
  };

  const nav = user.role === 'admin' ? [...NAV, ['users', '👥', 'Users']] : NAV;
  const [title, sub] = TITLES[page];
  const shared = { items, shopping, categories, go, act, openModal: (item) => setModal({ item }), deleteItem };

  return (
    <div className="app">
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="logo"><div className="logo-mark">🍳</div>KitchenStock</div>
        <nav className="nav">
          {nav.map(([id, icon, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="user-chip"><b>{user.name}</b><span>{user.email} • {user.role}</span></div>
          <button className="side-link" onClick={() => { setPwOpen(true); setMenuOpen(false); }}>Change password</button>
          <button className="side-link" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <div>
            <button className="btn mobile-menu" onClick={() => setMenuOpen((o) => !o)}>☰</button>
            <div className="eyebrow">Home Kitchen</div>
            <h1>{title}</h1>
            <p className="sub">{sub}</p>
          </div>
          {page !== 'users' && <div className="actions">
            <button className="btn" onClick={exportData}>↥ Export</button>
            <button className="btn" onClick={() => fileRef.current.click()}>↧ Import</button>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={importData} />
            <button className="btn primary" onClick={() => setModal({})}>+ Add Item</button>
          </div>}
        </header>

        {error && <div className="err">{error} <button className="btn" onClick={load}>Retry</button></div>}
        {loading ? (
          <div className="empty">Loading…</div>
        ) : (
          <>
            {page === 'dashboard' && <Dashboard {...shared} />}
            {page === 'inventory' && <Inventory {...shared} />}
            {page === 'shopping' && <Shopping {...shared} />}
            {page === 'categories' && <Categories {...shared} />}
            {page === 'users' && user.role === 'admin' && <Users me={user} notify={notify} />}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {nav.map(([id, icon, label]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}><span>{icon}</span>{label.replace(' List', '')}</button>
        ))}
      </nav>
      {pwOpen && <PasswordModal notify={notify} onClose={() => setPwOpen(false)} />}
      {modal && <ItemModal item={modal.item} categories={categories} onSave={saveItem} onClose={() => setModal(null)} />}
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
