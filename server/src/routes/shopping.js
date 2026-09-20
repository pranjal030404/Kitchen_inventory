import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.get('/', wrap(async (_req, res) => {
  const [rows] = await pool.query('SELECT id,name,qty,done FROM shopping_items ORDER BY id');
  res.json(rows.map((r) => ({ ...r, done: !!r.done })));
}));

router.post('/', wrap(async (req, res) => {
  const name = String(req.body.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const qty = String(req.body.qty || '');
  const [r] = await pool.query('INSERT INTO shopping_items (name,qty) VALUES (?,?)', [name, qty]);
  res.status(201).json({ id: r.insertId, name, qty, done: false });
}));

router.patch('/:id', wrap(async (req, res) => {
  const [r] = await pool.query('UPDATE shopping_items SET done=? WHERE id=?', [req.body.done ? 1 : 0, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Not found' });
  res.json({ id: Number(req.params.id), done: !!req.body.done });
}));

router.delete('/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM shopping_items WHERE id=?', [req.params.id]);
  res.status(204).end();
}));

export default router;
