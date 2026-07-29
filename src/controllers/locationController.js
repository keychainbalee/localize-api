import { eq, and, desc } from "drizzle-orm";
import { db } from "../config/db.js";
import { userLocations } from "../config/schema.js";

export const getMyLocations = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.select().from(userLocations)
      .where(eq(userLocations.userId, Number(userId)))
      .orderBy(desc(userLocations.isPrimary), desc(userLocations.id));

    const formatted = result.map(loc => ({
      id: loc.id,
      user_id: loc.userId,
      label: loc.label,
      address_text: loc.addressText,
      address_notes: loc.addressNotes,
      latitude: loc.latitude,
      longitude: loc.longitude,
      is_primary: loc.isPrimary,
      created_at: loc.createdAt
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addLocation = async (req, res) => {
  const userId = req.user.id;
  const { label, addressText, addressNotes, latitude, longitude, isPrimary } = req.body;

  if (!addressText) {
    return res.status(400).json({ success: false, message: "Alamat lengkap wajib diisi" });
  }

  try {
    if (isPrimary === 1) {
      await db.update(userLocations)
        .set({ isPrimary: 0 })
        .where(eq(userLocations.userId, Number(userId)));
    }

    const result = await db.insert(userLocations).values({
      userId: Number(userId),
      label: label || "Rumah",
      addressText,
      addressNotes: addressNotes || "",
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      isPrimary: isPrimary ? 1 : 0
    }).returning();

    const loc = result[0];
    const formatted = {
      id: loc.id,
      user_id: loc.userId,
      label: loc.label,
      address_text: loc.addressText,
      address_notes: loc.addressNotes,
      latitude: loc.latitude,
      longitude: loc.longitude,
      is_primary: loc.isPrimary,
      created_at: loc.createdAt
    };

    res.status(201).json({
      success: true,
      message: "Lokasi berhasil disimpan",
      data: formatted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateLocation = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { label, addressText, addressNotes, latitude, longitude, isPrimary } = req.body;

  try {
    const checkLoc = await db.select().from(userLocations)
      .where(and(
        eq(userLocations.id, Number(id)),
        eq(userLocations.userId, Number(userId))
      ));

    if (checkLoc.length === 0) {
      return res.status(404).json({ success: false, message: "Lokasi tidak ditemukan" });
    }

    const existing = checkLoc[0];

    if (isPrimary === 1) {
      await db.update(userLocations)
        .set({ isPrimary: 0 })
        .where(eq(userLocations.userId, Number(userId)));
    }

    await db.update(userLocations)
      .set({
        label: label || existing.label,
        addressText: addressText || existing.addressText,
        addressNotes: addressNotes !== undefined ? addressNotes : existing.addressNotes,
        latitude: latitude !== undefined ? Number(latitude) : existing.latitude,
        longitude: longitude !== undefined ? Number(longitude) : existing.longitude,
        isPrimary: isPrimary !== undefined ? (isPrimary ? 1 : 0) : existing.isPrimary
      })
      .where(and(
        eq(userLocations.id, Number(id)),
        eq(userLocations.userId, Number(userId))
      ));

    res.json({ success: true, message: "Lokasi berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteLocation = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await db.delete(userLocations)
      .where(and(
        eq(userLocations.id, Number(id)),
        eq(userLocations.userId, Number(userId))
      ));

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Lokasi tidak ditemukan" });
    }

    res.json({ success: true, message: "Lokasi berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};