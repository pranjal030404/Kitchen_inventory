import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

export const CATEGORIES = ['Grains & Rice', 'Pulses & Lentils', 'Spices', 'Oil & Sauces', 'Dairy', 'Vegetables', 'Fruits', 'Snacks', 'Beverages', 'Frozen', 'Bakery', 'Cleaning', 'Other'];

const COLS = 'id,name,category,quantity,unit,min_stock AS minStock,price,purchase_date AS purchaseDate,expiry_date AS expiryDate,location,supplier,notes';

const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

export function clean(b = {}) {
  const name = String(b.name ?? '').trim();
  if (!name) throw bad('Name is required');
  const quantity = Number(b.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) throw bad('Quantity must be a non-negative number');
  const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
  return {
    name,
    category: String(b.category || 'Other'),
    quantity,
    unit: String(b.unit || 'pcs'),
    min_stock: num(b.minStock),
    price: num(b.price),
    purchase_date: b.purchaseDate || null,
    expiry_date: b.expiryDate || null,
    location: String(b.location || '').trim(),
    supplier: String(b.supplier || '').trim(),
    notes: String(b.notes || '').trim(),
  };
}

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (req, res) => {
  const [rows] = await pool.query(`SELECT ${COLS} FROM items WHERE user_id=? ORDER BY name`, [req.user.id]);
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  const [r] = await pool.query('INSERT INTO items SET ?', [{ ...clean(req.body), user_id: req.user.id }]);
  const [[row]] = await pool.query(`SELECT ${COLS} FROM items WHERE id=?`, [r.insertId]);
  res.status(201).json(row);
}));

router.put('/:id', wrap(async (req, res) => {
  const [r] = await pool.query('UPDATE items SET ? WHERE id=? AND user_id=?', [clean(req.body), req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Item not found' });
  const [[row]] = await pool.query(`SELECT ${COLS} FROM items WHERE id=?`, [req.params.id]);
  res.json(row);
}));

router.delete('/:id', wrap(async (req, res) => {
  const [r] = await pool.query('DELETE FROM items WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Item not found' });
  res.status(204).end();
}));

export default router;
