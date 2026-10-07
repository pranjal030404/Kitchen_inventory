import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const { DB_HOST = 'localhost', DB_PORT = 3306, DB_USER = 'root', DB_PASSWORD = '', DB_NAME = 'kitchenstock' } = process.env;

const base = { host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD };

const day = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

// name, category, quantity, unit, minStock, price, purchase offset, expiry offset, location, supplier, notes
const sample = [
  ['Basmati Rice', 'Grains & Rice', 4.5, 'kg', 2, 95, -18, 180, 'Pantry - Shelf 1', 'DMart', 'Daily cooking'],
  ['Toor Dal', 'Pulses & Lentils', 0.8, 'kg', 1.5, 145, -25, 120, 'Pantry - Shelf 2', 'Local Market', ''],
  ['Turmeric Powder', 'Spices', 0.25, 'kg', 0.2, 210, -40, 70, 'Spice Rack', 'MDH', ''],
  ['Cooking Oil', 'Oil & Sauces', 1, 'L', 2, 155, -10, 14, 'Pantry - Shelf 3', 'Fortune', 'Buy 2L next trip'],
  ['Milk', 'Dairy', 2, 'L', 1, 65, -1, 2, 'Fridge', 'Mother Dairy', ''],
  ['Tomato', 'Vegetables', 0.6, 'kg', 1, 45, -1, 4, 'Fridge - Drawer', 'Local Market', ''],
  ['Potato', 'Vegetables', 3, 'kg', 1, 32, -5, 20, 'Vegetable Basket', 'Local Market', ''],
  ['Tea', 'Beverages', 0.45, 'kg', 0.25, 520, -30, 210, 'Pantry - Shelf 1', 'Tata', ''],
  ['Coffee', 'Beverages', 1, 'pack', 1, 340, -15, 150, 'Pantry - Shelf 1', 'Nescafe', ''],
  ['Bread', 'Bakery', 1, 'pack', 1, 45, -1, 1, 'Counter', 'Local Bakery', ''],
  ['Salt', 'Spices', 1.8, 'kg', 0.5, 28, -70, 500, 'Pantry - Shelf 2', 'Tata', ''],
  ['Dishwash Liquid', 'Cleaning', 0.4, 'L', 0.5, 125, -20, 365, 'Cleaning Cabinet', 'Vim', ''],
];

export let pool;

export async function initDb() {
  const boot = await mysql.createConnection(base);
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4`);
  await boot.end();

  pool = mysql.createPool({ ...base, database: DB_NAME, dateStrings: true, decimalNumbers: true, connectionLimit: 10 });

  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role ENUM('admin','user') NOT NULL DEFAULT 'user',
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) CHARACTER SET utf8mb4`);

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@kitchen.local').toLowerCase();
  let [[admin]] = await pool.query("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1");
  if (!admin) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
    const [r] = await pool.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)', [
      process.env.ADMIN_NAME || 'Admin', adminEmail, hash, 'admin',
    ]);
    admin = { id: r.insertId };
    console.log(`Created admin account ${adminEmail} (change the password after first login)`);
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    min_stock DECIMAL(10,2) NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    purchase_date DATE NULL,
    expiry_date DATE NULL,
    location VARCHAR(120) NOT NULL DEFAULT '',
    supplier VARCHAR(120) NOT NULL DEFAULT '',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_expiry (expiry_date),
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS shopping_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    qty VARCHAR(80) NOT NULL DEFAULT '',
    done TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) CHARACTER SET utf8mb4`);

  // Upgrade single-user databases: attach existing rows to the admin account.
  for (const table of ['items', 'shopping_items']) {
    const [[{ has }]] = await pool.query(
      'SELECT COUNT(*) AS has FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?',
      [DB_NAME, table, 'user_id']
    );
    if (!has) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN user_id INT NULL`);
      await pool.query(`UPDATE ${table} SET user_id=?`, [admin.id]);
      await pool.query(`ALTER TABLE ${table} MODIFY user_id INT NOT NULL, ADD INDEX idx_user (user_id), ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
    }
  }

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM items');
  if (n === 0) {
    const rows = sample.map(([name, category, quantity, unit, min, price, p, e, loc, sup, notes]) => [
      admin.id, name, category, quantity, unit, min, price, day(p), day(e), loc, sup, notes,
    ]);
    await pool.query(
      'INSERT INTO items (user_id,name,category,quantity,unit,min_stock,price,purchase_date,expiry_date,location,supplier,notes) VALUES ?',
      [rows]
    );
    console.log('Seeded sample inventory');
  }
}
