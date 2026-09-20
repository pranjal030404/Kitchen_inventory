import React from 'react';
import { buyQty, dateFmt, isExpiring, isLow, money, statusOf } from '../utils.js';

export function Pill({ item }) {
  const [color, label] = statusOf(item);
  return <span className={`pill ${color}`}>{label}</span>;
}

export function summarize(items) {
  const groups = {};
  items.forEach((x) => {
    (groups[x.category] ||= []).push(x);
  });
  return Object.entries(groups).map(([category, list]) => ({
    category,
    count: list.length,
    value: list.reduce((s, x) => s + x.quantity * x.price, 0),
  }));
}

export default function Dashboard({ items, go }) {
  const low = items.filter(isLow);
  const exp = items.filter(isExpiring);
  const value = items.reduce((s, x) => s + x.quantity * x.price, 0);
  const alerts = [...low, ...exp.filter((x) => !isLow(x))].slice(0, 6);
  const cats = summarize(items);

  return (
    <section>
      <div className="grid stats">
        <Stat label="Total Items" icon="📦" value={items.length} note="Unique pantry items" />
        <Stat label="Low Stock" icon="⚠️" value={low.length} note="Need attention" />
        <Stat label="Expiring Soon" icon="⏳" value={exp.length} note="Within 7 days" />
        <Stat label="Inventory Value" icon="₹" value={money(value)} note="Estimated current value" />
      </div>

      <div className="grid two">
        <div className="card section">
          <div className="section-head">
            <div><h2>Stock Alerts</h2><p>Items that need your attention</p></div>
            <button className="btn" onClick={() => go('inventory')}>View inventory</button>
          </div>
          <div className="alert-list">
            {alerts.map((x) => (
              <div className="alert" key={x.id}>
                <div>
                  <div className="item-name">{x.name}</div>
                  <div className="muted">{x.quantity} {x.unit} available • {x.expiryDate ? dateFmt(x.expiryDate) : 'No expiry'}</div>
                </div>
                <Pill item={x} />
              </div>
            ))}
            {!alerts.length && <div className="empty">🎉 Everything looks good!</div>}
          </div>
        </div>

        <div className="card section">
          <div className="section-head">
            <div><h2>Quick Shopping List</h2><p>Automatically suggested from low stock</p></div>
            <button className="btn" onClick={() => go('shopping')}>Open list</button>
          </div>
          <div className="shop-list">
            {low.slice(0, 5).map((x) => (
              <div className="shop" key={x.id}>
                <span>🛒</span>
                <div className="shop-info"><div className="shop-name">{x.name}</div><div className="qty">{buyQty(x)}</div></div>
              </div>
            ))}
            {!low.length && <div className="empty">No automatic items.</div>}
          </div>
        </div>
      </div>

      <div className="card section" style={{ marginTop: 16 }}>
        <div className="section-head"><div><h2>Inventory Overview</h2><p>Distribution across kitchen categories</p></div></div>
        <div className="grid category-grid">
          {cats.map((c) => (
            <div className="card category" key={c.category}>
              <strong>{c.category}</strong>
              <div className="count">{c.count}</div>
              <div className="value">{money(c.value)} estimated value</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, icon, value, note }) {
  return (
    <div className="card stat">
      <div className="stat-top">{label} <span className="stat-icon">{icon}</span></div>
      <h2>{value}</h2>
      <small>{note}</small>
    </div>
  );
}
