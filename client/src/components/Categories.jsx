import React from 'react';
import { money } from '../utils.js';
import { summarize } from './Dashboard.jsx';

export default function Categories({ items }) {
  const cats = summarize(items).sort((a, b) => b.count - a.count);
  return (
    <section className="card section">
      <div className="section-head"><div><h2>Categories</h2><p>See where your kitchen inventory is concentrated.</p></div></div>
      <div className="grid category-grid">
        {cats.map((c) => (
          <div className="card category" key={c.category}>
            <strong>{c.category}</strong>
            <div className="count">{c.count}</div>
            <div className="value">{money(c.value)}</div>
            <div className="progress"><i style={{ width: `${Math.min(100, (c.count / items.length) * 100)}%` }} /></div>
          </div>
        ))}
        {!cats.length && <div className="empty">No categories yet.</div>}
      </div>
    </section>
  );
}
