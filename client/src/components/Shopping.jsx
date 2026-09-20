import React, { useState } from 'react';
import { api } from '../api.js';
import { buyQty, isLow } from '../utils.js';

export default function Shopping({ items, shopping, act }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1 pack');
  const [autoDone, setAutoDone] = useState({}); // session-only ticks for auto-suggested rows

  const auto = items.filter(isLow);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (await act(() => api.addShopping({ name: name.trim(), qty: qty.trim() }), 'Added to shopping list')) {
      setName('');
      setQty('1 pack');
      setAdding(false);
    }
  };

  return (
    <section className="card section">
      <div className="section-head">
        <div><h2>Shopping List</h2><p>Items you need to replenish</p></div>
        <button className="btn primary" onClick={() => setAdding((a) => !a)}>{adding ? 'Cancel' : '+ Add item'}</button>
      </div>

      {adding && (
        <form className="toolbar" onSubmit={submit}>
          <div className="search"><input autoFocus placeholder="What do you need to buy?" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="search"><input placeholder="Quantity / note (optional)" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <button className="btn primary">Add</button>
        </form>
      )}

      <div className="shop-list">
        {auto.map((x) => (
          <div className={`shop ${autoDone[x.id] ? 'done' : ''}`} key={`a${x.id}`}>
            <input type="checkbox" checked={!!autoDone[x.id]} onChange={() => setAutoDone((d) => ({ ...d, [x.id]: !d[x.id] }))} />
            <div className="shop-info"><div className="shop-name">{x.name}</div><div className="qty">{buyQty(x)} • Auto suggested</div></div>
          </div>
        ))}
        {shopping.map((x) => (
          <div className={`shop ${x.done ? 'done' : ''}`} key={`c${x.id}`}>
            <input type="checkbox" checked={x.done} onChange={() => act(() => api.toggleShopping(x.id, !x.done))} />
            <div className="shop-info"><div className="shop-name">{x.name}</div><div className="qty">{x.qty}</div></div>
            <button className="icon-btn" onClick={() => act(() => api.deleteShopping(x.id))}>✕</button>
          </div>
        ))}
        {!auto.length && !shopping.length && <div className="empty">Your shopping list is empty.</div>}
      </div>
    </section>
  );
}
