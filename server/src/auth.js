import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set in server/.env');
  return process.env.JWT_SECRET;
};

export const signToken = (user) => jwt.sign({ id: user.id }, secret(), { expiresIn: '7d' });

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active });

export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const { id } = jwt.verify(token, secret());
    // Look the user up every request so disabled/deleted accounts lose access immediately.
    const [[user]] = await pool.query('SELECT id,name,email,role,active FROM users WHERE id=?', [id]);
    if (!user || !user.active) return res.status(401).json({ error: 'Account is not active' });
    req.user = user;
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Session expired, please sign in again' });
    next(e);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}
