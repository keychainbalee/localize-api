import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { storeSettings, userLocations, users } from "../config/schema.js";

export const getStoreSettings = async (req, res) => {
  try {
    // Get primary location of the user with 'admin' role
    const result = await db.select({
      id: userLocations.id,
      label: userLocations.label,
      addressText: userLocations.addressText,
      addressNotes: userLocations.addressNotes,
      latitude: userLocations.latitude,
      longitude: userLocations.longitude,
      isPrimary: userLocations.isPrimary
    })
    .from(userLocations)
    .innerJoin(users, eq(userLocations.userId, users.id))
    .where(and(
      eq(users.role, "admin"),
      eq(userLocations.isPrimary, 1)
    ));

    if (result.length === 0) {
      // Fallback to storeSettings table if no admin location is defined
      const fallbackResult = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
      if (fallbackResult.length === 0) {
        return res.json({
          success: true,
          data: {
            id: 1,
            name: "Toko Pusat Localize",
            address: "Grand Indonesia, Jakarta",
            latitude: -6.1953,
            longitude: 106.8203,
            shipping_fee_per_km: 2000
          }
        });
      }
      const store = fallbackResult[0];
      return res.json({
        success: true,
        data: {
          id: store.id,
          name: store.name,
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          shipping_fee_per_km: store.shippingFeePerKm
        }
      });
    }

    const adminLoc = result[0];
    const formatted = {
      id: adminLoc.id,
      name: adminLoc.label || "Toko Pusat Localize",
      address: adminLoc.addressText,
      latitude: adminLoc.latitude,
      longitude: adminLoc.longitude,
      shipping_fee_per_km: 2000
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
    // Reset all admin locations to not primary
    await db.update(userLocations)
      .set({ isPrimary: 0 })
      .where(eq(userLocations.userId, req.user.id));

    // Try to update or insert primary location for admin
    const checkLoc = await db.select().from(userLocations)
      .where(and(
        eq(userLocations.userId, req.user.id),
        eq(userLocations.label, name || "Toko Utama")
      ));

    if (checkLoc.length > 0) {
      await db.update(userLocations)
        .set({
          addressText: address,
          latitude: Number(latitude),
          longitude: Number(longitude),
          isPrimary: 1
        })
        .where(eq(userLocations.id, checkLoc[0].id));
    } else {
      await db.insert(userLocations).values({
        userId: req.user.id,
        label: name || "Toko Utama",
        addressText: address,
        addressNotes: "",
        latitude: Number(latitude),
        longitude: Number(longitude),
        isPrimary: 1
      }).returning();
    }

    // Update fallback storeSettings table too
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
