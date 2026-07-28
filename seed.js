import dotenv from "dotenv";
dotenv.config(); 

import { db } from "./src/config/db.js";

async function seed() {
  console.log("Menghubungkan ke Turso dan membuat tabel...");

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone_number TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        shipping_address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price_at_purchase REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);

    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, full_name, email, phone_number, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [1, 'Pelanggan Pertama', 'user@mail.com', '081234567890', '123456', 'customer']
    });

    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, full_name, email, phone_number, password_hash, role)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [2, 'Admin Localize', 'admin@localize.com', '089876543210', 'admin123', 'admin']
    });

    await db.execute({
      sql: `INSERT OR IGNORE INTO products (id, name, description, price, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [1, 'Compass Gazette Low', 'Sepatu kanvas lokal desain klasik modern.', 398000, 20, 'https://res.cloudinary.com/djy19s5bk/image/upload/v1700000000/compass_low.jpg']
    });

    await db.execute({
      sql: `INSERT OR IGNORE INTO products (id, name, description, price, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [2, 'Ventela Public Low', 'Sepatu lokal paling populer dengan insole Ultralite Foam.', 289000, 35, 'https://res.cloudinary.com/djy19s5bk/image/upload/v1700000000/ventela_public.jpg']
    });

    await db.execute({
      sql: `INSERT OR IGNORE INTO products (id, name, description, price, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [3, 'Patrobas Equip High', 'Sepatu high-top lokal dengan material breathable canvas.', 319000, 15, 'https://res.cloudinary.com/djy19s5bk/image/upload/v1700000000/patrobas_high.jpg']
    });

    console.log("✅ Berhasil! Skema tabel dan data sampel sepatu sudah tersimpan di Turso.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat migrasi/seed:", error);
    process.exit(1);
  }
}

seed();