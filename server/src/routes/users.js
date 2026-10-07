import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIST = `SELECT u.id,u.name,u.email,u.role,u.active=1 AS active,u.created_at AS createdAt,
  (SELECT COUNT(*) FROM items i WHERE i.user_id=u.id) AS itemCount
  FROM users u`;

const shape = (r) => ({ ...r, active: !!r.active });

async function activeAdminCount(excludeId) {
  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1 AND id<>?", [excludeId]);
  return n;
}

router.get('/', wrap(async (_req, res) => {
  const [rows] = await pool.query(`${LIST} ORDER BY u.id`);
  res.json(rows.map(shape));
}));

router.post('/', wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role === 'admin' ? 'admin' : 'user';
  if (!name) return bad(res, 'Name is required');
  if (!EMAIL.test(email)) return bad(res, 'A valid email is required');
  if (password.length < 8) return bad(res, 'Password must be at least 8 characters');
  const [[dup]] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (dup) return bad(res, 'A user with this email already exists', 409);
  const [r] = await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [name, email, await bcrypt.hash(password, 10), role]);
  const [[row]] = await pool.query(`${LIST} WHERE u.id=?`, [r.insertId]);
  res.status(201).json(shape(row));
}));

router.patch('/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  const [[user]] = await pool.query('SELECT * FROM users WHERE id=?', [id]);
  if (!user) return bad(res, 'User not found', 404);

  const set = {};
  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) return bad(res, 'Name is required');
    set.name = String(req.body.name).trim();
  }
  if (req.body.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase();
    if (!EMAIL.test(email)) return bad(res, 'A valid email is required');
    const [[dup]] = await pool.query('SELECT id FROM users WHERE email=? AND id<>?', [email, id]);
    if (dup) return bad(res, 'A user with this email already exists', 409);
    set.email = email;
  }
  if (req.body.role !== undefined) set.role = req.body.role === 'admin' ? 'admin' : 'user';
  if (req.body.active !== undefined) set.active = req.body.active ? 1 : 0;
  if (req.body.password) {
    if (String(req.body.password).length < 8) return bad(res, 'Password must be at least 8 characters');
    set.password_hash = await bcrypt.hash(String(req.body.password), 10);
  }

  // Never lock everyone out: the last active admin can't be demoted or disabled.
  const losesAdmin = user.role === 'admin' && ((set.role && set.role !== 'admin') || set.active === 0);
  if (losesAdmin && (id === req.user.id || (await activeAdminCount(id)) === 0))
    return bad(res, id === req.user.id ? 'You cannot demote or disable your own account' : 'At least one active admin is required');

  if (Object.keys(set).length) await pool.query('UPDATE users SET ? WHERE id=?', [set, id]);
  const [[row]] = await pool.query(`${LIST} WHERE u.id=?`, [id]);
  res.json(shape(row));
}));

router.delete('/:id', wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return bad(res, 'You cannot delete your own account');
  const [[user]] = await pool.query('SELECT role FROM users WHERE id=?', [id]);
  if (!user) return bad(res, 'User not found', 404);
  if (user.role === 'admin' && (await activeAdminCount(id)) === 0) return bad(res, 'At least one active admin is required');
  await pool.query('DELETE FROM users WHERE id=?', [id]);
  res.status(204).end();
}));

export default router;
