import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { publicUser, requireAuth, signToken } from '../auth.js';

const router = Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Basic brute-force guard: 10 failed attempts per email+IP per 15 minutes.
const fails = new Map();
const WINDOW = 15 * 60 * 1000;
const tooMany = (key) => {
  const e = fails.get(key);
  if (e && Date.now() - e.t > WINDOW) fails.delete(key);
  return (fails.get(key)?.n || 0) >= 10;
};
const fail = (key) => {
  const e = fails.get(key);
  fails.set(key, { n: (e && Date.now() - e.t <= WINDOW ? e.n : 0) + 1, t: e?.t && Date.now() - e.t <= WINDOW ? e.t : Date.now() });
};

router.post('/login', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const key = `${email}|${req.ip}`;
  if (tooMany(key)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
  const [[user]] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    fail(key);
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.active) return res.status(403).json({ error: 'This account has been disabled' });
  fails.delete(key);
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/change-password', requireAuth, wrap(async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body;
  if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  const [[user]] = await pool.query('SELECT password_hash FROM users WHERE id=?', [req.user.id]);
  if (!(await bcrypt.compare(String(currentPassword), user.password_hash))) return res.status(400).json({ error: 'Current password is incorrect' });
  await pool.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(String(newPassword), 10), req.user.id]);
  res.json({ ok: true });
}));

export default router;
