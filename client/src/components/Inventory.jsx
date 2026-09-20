import React, { useState } from 'react';
import { dateFmt, isExpiring, isLow, money } from '../utils.js';
import { Pill } from './Dashboard.jsx';

export default function Inventory({ items, categories, openModal, deleteItem }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [stock, setStock] = useState('');

  const term = q.toLowerCase();
  const rows = items.filter(
    (x) =>
      (!term || [x.name, x.category, x.location, x.supplier].join(' ').toLowerCase().includes(term)) &&
      (!cat || x.category === cat) &&
      (!stock || (stock === 'low' && isLow(x)) || (stock === 'expiring' && isExpiring(x)))
  );

  return (
    <section>
      <div className="toolbar">
        <div className="search">
          <input placeholder="Search ingredients, shops, locations..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={stock} onChange={(e) => setStock(e.target.value)}>
          <option value="">All stock</option>
          <option value="low">Low stock</option>
          <option value="expiring">Expiring soon</option>
        </select>
        <button className="btn" onClick={() => openModal()}>+ Add Item</button>
      </div>

      <div className="card section table-wrap">
        <table className="table">
          <thead>
            <tr><th>Item</th><th>Category</th><th>Quantity</th><th>Expiry</th><th>Value</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td><b>{x.name}</b><div className="muted">{x.location || 'No location'}</div></td>
                <td>{x.category}</td>
                <td>{x.quantity} {x.unit}<div className="muted">min {x.minStock} {x.unit}</div></td>
                <td>{dateFmt(x.expiryDate)}</td>
                <td>{money(x.quantity * x.price)}</td>
                <td><Pill item={x} /></td>
                <td>
                  <div className="actions-cell">
                    <button className="icon-btn" title="Edit" onClick={() => openModal(x)}>✎</button>
                    <button className="icon-btn" title="Delete" onClick={() => deleteItem(x)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="7"><div className="empty">No items found.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
