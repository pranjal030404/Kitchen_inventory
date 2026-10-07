import { Router } from 'express';
import { pool } from '../db.js';
import { CATEGORIES, clean } from './items.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/categories', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT category, COUNT(*) AS count, SUM(quantity*price) AS value FROM items WHERE user_id=? GROUP BY category', [req.user.id]);
  const map = Object.fromEntries(rows.map((r) => [r.category, r]));
  const list = [...CATEGORIES, ...rows.map((r) => r.category).filter((c) => !CATEGORIES.includes(c))];
  res.json({
    list,
    stats: list.map((c) => ({ category: c, count: map[c]?.count || 0, value: Number(map[c]?.value || 0) })),
  });
}));

router.get('/export', wrap(async (req, res) => {
  const [items] = await pool.query('SELECT name,category,quantity,unit,min_stock AS minStock,price,purchase_date AS purchaseDate,expiry_date AS expiryDate,location,supplier,notes FROM items WHERE user_id=?', [req.user.id]);
  const [shopping] = await pool.query('SELECT name,qty,done FROM shopping_items WHERE user_id=?', [req.user.id]);
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
    await conn.query('DELETE FROM items WHERE user_id=?', [req.user.id]);
    await conn.query('DELETE FROM shopping_items WHERE user_id=?', [req.user.id]);
    for (const it of cleaned) await conn.query('INSERT INTO items SET ?', [{ ...it, user_id: req.user.id }]);
    for (const s of Array.isArray(shopping) ? shopping : [])
      if (s?.name) await conn.query('INSERT INTO shopping_items (user_id,name,qty,done) VALUES (?,?,?,?)', [req.user.id, String(s.name), String(s.qty || ''), s.done ? 1 : 0]);
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
