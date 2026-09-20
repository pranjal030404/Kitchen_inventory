import React, { useState } from 'react';
import { todayISO } from '../utils.js';

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'bottle', 'dozen'];

export default function ItemModal({ item, categories, onSave, onClose }) {
  const [f, setF] = useState(
    item || {
      name: '', category: categories[0] || 'Other', quantity: '', unit: 'kg', minStock: 1, price: 0,
      purchaseDate: todayISO(), expiryDate: '', location: '', supplier: '', notes: '',
    }
  );
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave(
      { ...f, quantity: Number(f.quantity), minStock: Number(f.minStock || 0), price: Number(f.price || 0) },
      item?.id
    );
    if (!ok) setSaving(false);
  };

  return (
    <div className="modal-bg open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{item ? 'Edit Kitchen Item' : 'Add Kitchen Item'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form className="form" onSubmit={submit}>
          <Field label="ITEM NAME *"><input required value={f.name} onChange={set('name')} placeholder="e.g. Basmati Rice" /></Field>
          <Field label="CATEGORY *">
            <select required value={f.category} onChange={set('category')}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="QUANTITY *"><input required type="number" min="0" step="0.01" value={f.quantity} onChange={set('quantity')} placeholder="5" /></Field>
          <Field label="UNIT *">
            <select value={f.unit} onChange={set('unit')}>
              {[...new Set([...UNITS, f.unit])].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="MINIMUM STOCK"><input type="number" min="0" step="0.01" value={f.minStock} onChange={set('minStock')} /></Field>
          <Field label="PRICE / UNIT (₹)"><input type="number" min="0" step="0.01" value={f.price} onChange={set('price')} /></Field>
          <Field label="PURCHASE DATE"><input type="date" value={f.purchaseDate || ''} onChange={set('purchaseDate')} /></Field>
          <Field label="EXPIRY DATE"><input type="date" value={f.expiryDate || ''} onChange={set('expiryDate')} /></Field>
          <Field label="LOCATION"><input value={f.location} onChange={set('location')} placeholder="Pantry shelf 2" /></Field>
          <Field label="SHOP / SUPPLIER"><input value={f.supplier} onChange={set('supplier')} placeholder="Local market" /></Field>
          <Field label="NOTES" full><textarea value={f.notes || ''} onChange={set('notes')} placeholder="Anything useful about this item..." /></Field>
          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, full, children }) => (
  <div className={`field ${full ? 'full' : ''}`}><label>{label}</label>{children}</div>
);
