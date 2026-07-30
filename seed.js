import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { db } from "./src/config/db.js";
import { users, userLocations, products, orderItems, orders, storeSettings, cartItems } from "./src/config/schema.js";

async function seed() {
  console.log("⏳ Menghubungkan ke Turso dan mengosongkan tabel...");

  try {
    await db.delete(cartItems);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(userLocations);
    await db.delete(products);
    await db.delete(users);
    await db.delete(storeSettings);

    console.log("🔄 Tabel berhasil dikosongkan, memulai seeding data baru...");

    await db.insert(users).values([
      {
        id: 1,
        fullName: 'Pelanggan Pertama',
        email: 'user@mail.com',
        phoneNumber: '081234567890',
        passwordHash: bcrypt.hashSync('123456', 10),
        role: 'customer'
      },
      {
        id: 2,
        fullName: 'Admin Localize',
        email: 'admin@localize.com',
        phoneNumber: '089876543210',
        passwordHash: bcrypt.hashSync('admin123', 10),
        role: 'admin'
      }
    ]);

    console.log("✅ Seed Users berhasil!");

    await db.insert(userLocations).values([
      {
        userId: 1,
        label: 'Rumah Utama',
        addressText: 'Jl. Sudirman No. 45, Kebayoran Baru, Jakarta Selatan',
        addressNotes: 'Pagar hitam, cat tembok abu-abu',
        latitude: -6.2297,
        longitude: 106.8006,
        isPrimary: 1
      },
      {
        userId: 1,
        label: 'Kantor',
        addressText: 'Gedung Wisma 46 Lt. 12, Jl. Jend. Gatot Subroto, Jakarta Pusat',
        addressNotes: 'Titipkan di Resepsionis Lt. 1',
        latitude: -6.2088,
        longitude: 106.8180,
        isPrimary: 0
      }
    ]);

    console.log("✅ Seed Locations berhasil!");

    const compassSizeStock = JSON.stringify({ "39": 5, "40": 10, "41": 0, "42": 8 });
    const ventelaSizeStock = JSON.stringify({ "38": 12, "39": 0, "40": 15, "41": 3 });

    await db.insert(products).values([
      {
        id: 1,
        name: 'Compass Gazette Low',
        brand: 'Compass',
        description: 'Sepatu kanvas lokal desain klasik modern.',
        price: 398000,
        stock: 23,
        sizeStock: compassSizeStock,
        imageUrl: 'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?q=80&w=600',
        soldCount: 0
      },
      {
        id: 2,
        name: 'Ventela Public Low',
        brand: 'Ventela',
        description: 'Sepatu lokal paling populer dengan insole Ultralite Foam.',
        price: 289000,
        stock: 30,
        sizeStock: ventelaSizeStock,
        imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=600',
        soldCount: 0
      }
    ]);

    console.log("✅ Seed Products berhasil!");

    await db.insert(storeSettings).values({
      id: 1,
      name: 'Localize Store Jakarta',
      address: 'Grand Indonesia Mall, Jakarta Pusat',
      latitude: -6.1953,
      longitude: 106.8203,
      shippingFeePerKm: 2500
    });

    console.log("✅ Berhasil memperbarui skema (termasuk user_locations & store_settings) dan seeding database Turso via Drizzle!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Terjadi kesalahan seeder:", error);
    process.exit(1);
  }
}

seed();