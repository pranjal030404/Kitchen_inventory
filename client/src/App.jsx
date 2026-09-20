import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
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
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [shopping, setShopping] = useState([]);
  const [categories, setCategories] = useState([]);
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

  const [title, sub] = TITLES[page];
  const shared = { items, shopping, categories, go, act, openModal: (item) => setModal({ item }), deleteItem };

  return (
    <div className="app">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="logo"><div className="logo-mark">🍳</div>KitchenStock</div>
        <nav className="nav">
          {NAV.map(([id, icon, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => go(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="side-bottom">Your home kitchen, organized.<br />Data is stored in MySQL.</div>
      </aside>

      <main className="main">
        <header className="top">
          <div>
            <button className="btn mobile-menu" onClick={() => setMenuOpen((o) => !o)}>☰</button>
            <div className="eyebrow">Home Kitchen</div>
            <h1>{title}</h1>
            <p className="sub">{sub}</p>
          </div>
          <div className="actions">
            <button className="btn" onClick={exportData}>↥ Export</button>
            <button className="btn" onClick={() => fileRef.current.click()}>↧ Import</button>
            <input ref={fileRef} type="file" accept=".json" hidden onChange={importData} />
            <button className="btn primary" onClick={() => setModal({})}>+ Add Item</button>
          </div>
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
          </>
        )}
      </main>

      {modal && <ItemModal item={modal.item} categories={categories} onSave={saveItem} onClose={() => setModal(null)} />}
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
