import { db } from "../config/db.js";

// [GET] Mengambil Semua Lokasi Tersimpan Milik User Login
export const getMyLocations = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.execute({
      sql: "SELECT * FROM user_locations WHERE user_id = ? ORDER BY is_primary DESC, id DESC",
      args: [userId],
    });

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [POST] Menambah Lokasi Baru
export const addLocation = async (req, res) => {
  const userId = req.user.id;
  const { label, addressText, addressNotes, latitude, longitude, isPrimary } = req.body;

  if (!addressText) {
    return res.status(400).json({ success: false, message: "Alamat lengkap wajib diisi" });
  }

  try {
    // Jika diset sebagai alamat utama, nonaktifkan flag is_primary alamat lainnya
    if (isPrimary === 1) {
      await db.execute({
        sql: "UPDATE user_locations SET is_primary = 0 WHERE user_id = ?",
        args: [userId],
      });
    }

    const result = await db.execute({
      sql: `INSERT INTO user_locations (user_id, label, address_text, address_notes, latitude, longitude, is_primary) 
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        userId,
        label || "Rumah",
        addressText,
        addressNotes || "",
        latitude || 0,
        longitude || 0,
        isPrimary ? 1 : 0,
      ],
    });

    res.status(201).json({
      success: true,
      message: "Lokasi berhasil disimpan",
      data: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [PUT] Mengubah Lokasi Tersimpan
export const updateLocation = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { label, addressText, addressNotes, latitude, longitude, isPrimary } = req.body;

  try {
    const checkLoc = await db.execute({
      sql: "SELECT * FROM user_locations WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });

    if (checkLoc.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Lokasi tidak ditemukan" });
    }

    const existing = checkLoc.rows[0];

    if (isPrimary === 1) {
      await db.execute({
        sql: "UPDATE user_locations SET is_primary = 0 WHERE user_id = ?",
        args: [userId],
      });
    }

    await db.execute({
      sql: `UPDATE user_locations 
            SET label = ?, address_text = ?, address_notes = ?, latitude = ?, longitude = ?, is_primary = ? 
            WHERE id = ? AND user_id = ?`,
      args: [
        label || existing.label,
        addressText || existing.address_text,
        addressNotes !== undefined ? addressNotes : existing.address_notes,
        latitude !== undefined ? latitude : existing.latitude,
        longitude !== undefined ? longitude : existing.longitude,
        isPrimary !== undefined ? (isPrimary ? 1 : 0) : existing.is_primary,
        id,
        userId,
      ],
    });

    res.json({ success: true, message: "Lokasi berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [DELETE] Menghapus Lokasi
export const deleteLocation = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await db.execute({
      sql: "DELETE FROM user_locations WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Lokasi tidak ditemukan" });
    }

    res.json({ success: true, message: "Lokasi berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};