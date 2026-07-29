import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { db } from "./src/config/db.js";

async function seed() {
  console.log("⏳ Menghubungkan ke Turso dan mereset tabel...");

  try {
    await db.execute("DROP TABLE IF EXISTS order_items;");
    await db.execute("DROP TABLE IF EXISTS orders;");
    await db.execute("DROP TABLE IF EXISTS user_locations;");
    await db.execute("DROP TABLE IF EXISTS products;");
    await db.execute("DROP TABLE IF EXISTS users;");
    await db.execute("DROP TABLE IF EXISTS store_settings;");

    console.log("🔄 Reset tabel berhasil, membuat skema tabel baru...");

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
      CREATE TABLE IF NOT EXISTS user_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        label TEXT NOT NULL DEFAULT 'Rumah',
        address_text TEXT NOT NULL,
        address_notes TEXT,
        latitude REAL DEFAULT 0,
        longitude REAL DEFAULT 0,
        is_primary INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        size_stock TEXT NOT NULL DEFAULT '{}',
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
        address_notes TEXT,
        latitude REAL,
        longitude REAL,
        distance REAL DEFAULT 0,
        shipping_fee REAL DEFAULT 0,
        status TEXT DEFAULT 'dipesan',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS store_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL DEFAULT 'Toko Utama',
        address TEXT NOT NULL,
        latitude REAL DEFAULT 0,
        longitude REAL DEFAULT 0,
        shipping_fee_per_km REAL DEFAULT 2000
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        size TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price_at_purchase REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    await db.execute({
      sql: `INSERT INTO users (id, full_name, email, phone_number, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [1, 'Pelanggan Pertama', 'user@mail.com', '081234567890', bcrypt.hashSync('123456', 10), 'customer']
    });

    await db.execute({
      sql: `INSERT INTO users (id, full_name, email, phone_number, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [2, 'Admin Localize', 'admin@localize.com', '089876543210', bcrypt.hashSync('admin123', 10), 'admin']
    });

    // Seed Data Lokasi Tersimpan untuk User ID 1 (Rumah & Kantor)
    await db.execute({
      sql: `INSERT INTO user_locations (user_id, label, address_text, address_notes, latitude, longitude, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [1, 'Rumah Utama', 'Jl. Sudirman No. 45, Kebayoran Baru, Jakarta Selatan', 'Pagar hitam, cat tembok abu-abu', -6.2297, 106.8006, 1]
    });

    await db.execute({
      sql: `INSERT INTO user_locations (user_id, label, address_text, address_notes, latitude, longitude, is_primary) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [1, 'Kantor', 'Gedung Wisma 46 Lt. 12, Jl. Jend. Gatot Subroto, Jakarta Pusat', 'Titipkan di Resepsionis Lt. 1', -6.2088, 106.8180, 0]
    });

    const compassSizeStock = JSON.stringify({ "39": 5, "40": 10, "41": 0, "42": 8 });
    const ventelaSizeStock = JSON.stringify({ "38": 12, "39": 0, "40": 15, "41": 3 });

    await db.execute({
      sql: `INSERT INTO products (id, name, description, price, stock, size_stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [1, 'Compass Gazette Low', 'Sepatu kanvas lokal desain klasik modern.', 398000, 23, compassSizeStock, 'https://res.cloudinary.com/djy19s5bk/image/upload/v1700000000/compass_low.jpg']
    });

    await db.execute({
      sql: `INSERT INTO products (id, name, description, price, stock, size_stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [2, 'Ventela Public Low', 'Sepatu lokal paling populer dengan insole Ultralite Foam.', 289000, 30, ventelaSizeStock, 'https://res.cloudinary.com/djy19s5bk/image/upload/v1700000000/ventela_public.jpg']
    });

    await db.execute({
      sql: `INSERT INTO store_settings (id, name, address, latitude, longitude, shipping_fee_per_km) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [1, 'Localize Store Jakarta', 'Grand Indonesia Mall, Jakarta Pusat', -6.1953, 106.8203, 2500]
    });

    console.log("✅ Berhasil memperbarui skema (termasuk user_locations & store_settings) dan seeding database Turso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Terjadi kesalahan seeder:", error);
    process.exit(1);
  }
}

seed();