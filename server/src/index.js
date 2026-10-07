import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import itemsRouter from './routes/items.js';
import shoppingRouter from './routes/shopping.js';
import dataRouter from './routes/data.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import { requireAuth, requireAdmin } from './auth.js';

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/users', requireAuth, requireAdmin, usersRouter);
app.use('/api/items', requireAuth, itemsRouter);
app.use('/api/shopping', requireAuth, shoppingRouter);
app.use('/api', requireAuth, dataRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});

const port = Number(process.env.PORT) || 4000;
initDb()
  .then(() => app.listen(port, () => console.log(`KitchenStock API on http://localhost:${port}`)))
  .catch((e) => {
    console.error('Database initialisation failed:', e.message);
    process.exit(1);
  });
