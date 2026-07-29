import { db } from "../config/db.js";

export const getStoreSettings = async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM store_settings WHERE id = 1");
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Setting toko belum diinisialisasi" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStoreSettings = async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Akses ditolak. Hanya admin yang diperbolehkan." });
  }

  const { name, address, latitude, longitude, shippingFeePerKm } = req.body;

  if (!address || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: "Alamat, latitude, dan longitude wajib diisi." });
  }

  try {
    const checkSettings = await db.execute("SELECT * FROM store_settings WHERE id = 1");
    if (checkSettings.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO store_settings (id, name, address, latitude, longitude, shipping_fee_per_km) VALUES (1, ?, ?, ?, ?, ?)",
        args: [name || "Toko Utama", address, latitude, longitude, shippingFeePerKm !== undefined ? shippingFeePerKm : 2000]
      });
    } else {
      await db.execute({
        sql: `UPDATE store_settings 
              SET name = ?, address = ?, latitude = ?, longitude = ?, shipping_fee_per_km = ? 
              WHERE id = 1`,
        args: [
          name || checkSettings.rows[0].name,
          address,
          latitude,
          longitude,
          shippingFeePerKm !== undefined ? shippingFeePerKm : checkSettings.rows[0].shipping_fee_per_km
        ]
      });
    }

    res.json({ success: true, message: "Pengaturan lokasi penjual berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
