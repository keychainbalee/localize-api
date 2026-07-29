import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { storeSettings } from "../config/schema.js";

export const getStoreSettings = async (req, res) => {
  try {
    const result = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Setting toko belum diinisialisasi" });
    }
    const store = result[0];
    const formatted = {
      id: store.id,
      name: store.name,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      shipping_fee_per_km: store.shippingFeePerKm
    };
    res.json({ success: true, data: formatted });
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
    const checkSettings = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
    if (checkSettings.length === 0) {
      await db.insert(storeSettings).values({
        id: 1,
        name: name || "Toko Utama",
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        shippingFeePerKm: shippingFeePerKm !== undefined ? Number(shippingFeePerKm) : 2000
      });
    } else {
      await db.update(storeSettings)
        .set({
          name: name || checkSettings[0].name,
          address,
          latitude: Number(latitude),
          longitude: Number(longitude),
          shippingFeePerKm: shippingFeePerKm !== undefined ? Number(shippingFeePerKm) : checkSettings[0].shippingFeePerKm
        })
        .where(eq(storeSettings.id, 1));
    }

    res.json({ success: true, message: "Pengaturan lokasi penjual berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
