import { Router } from 'express';
import { pool } from '../db.js';
import { CATEGORIES, clean } from './items.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/categories', wrap(async (_req, res) => {
  const [rows] = await pool.query('SELECT category, COUNT(*) AS count, SUM(quantity*price) AS value FROM items GROUP BY category');
  const map = Object.fromEntries(rows.map((r) => [r.category, r]));
  const list = [...CATEGORIES, ...rows.map((r) => r.category).filter((c) => !CATEGORIES.includes(c))];
  res.json({
    list,
    stats: list.map((c) => ({ category: c, count: map[c]?.count || 0, value: Number(map[c]?.value || 0) })),
  });
}));

router.get('/export', wrap(async (_req, res) => {
  const [items] = await pool.query('SELECT name,category,quantity,unit,min_stock AS minStock,price,purchase_date AS purchaseDate,expiry_date AS expiryDate,location,supplier,notes FROM items');
  const [shopping] = await pool.query('SELECT name,qty,done FROM shopping_items');
  res.json({
    app: 'KitchenStock',
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    shopping: shopping.map((s) => ({ ...s, done: !!s.done })),
  });
}));

router.post('/import', wrap(async (req, res) => {
  const { items, shopping = [] } = req.body || {};
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid KitchenStock backup file' });
  const cleaned = items.map(clean);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM items');
    await conn.query('DELETE FROM shopping_items');
    for (const it of cleaned) await conn.query('INSERT INTO items SET ?', [it]);
    for (const s of Array.isArray(shopping) ? shopping : [])
      if (s?.name) await conn.query('INSERT INTO shopping_items (name,qty,done) VALUES (?,?,?)', [String(s.name), String(s.qty || ''), s.done ? 1 : 0]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  res.json({ imported: cleaned.length });
}));

export default router;
