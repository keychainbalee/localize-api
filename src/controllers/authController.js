import { db } from "../config/db.js";

export const register = async (req, res) => {
  const { fullName, email, phoneNumber, password, role } = req.body;

  if (!fullName || !email || !phoneNumber || !password) {
    return res.status(400).json({ success: false, message: "Semua field wajib diisi" });
  }

  try {
    const result = await db.execute({
      sql: `INSERT INTO users (full_name, email, phone_number, password_hash, role) 
            VALUES (?, ?, ?, ?, ?) RETURNING id, full_name, email, phone_number, role`,
      args: [fullName, email, phoneNumber, password, role || "customer"],
    });

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.execute({
      sql: "SELECT id, full_name, email, phone_number, role, password_hash FROM users WHERE email = ?",
      args: [email],
    });

    if (result.rows.length === 0 || result.rows[0].password_hash !== password) {
      return res.status(401).json({ success: false, message: "Email atau password salah" });
    }

    const user = result.rows[0];
    delete user.password_hash;

    res.json({ success: true, message: "Login berhasil", user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const result = await db.execute("SELECT id, full_name, email, phone_number, role, created_at FROM users");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT id, full_name, email, phone_number, role, created_at FROM users WHERE id = ?",
      args: [req.params.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, phoneNumber, role } = req.body;

  try {
    await db.execute({
      sql: "UPDATE users SET full_name = ?, phone_number = ?, role = ? WHERE id = ?",
      args: [fullName, phoneNumber, role, id],
    });

    res.json({ success: true, message: "Profil user berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [id],
    });

    res.json({ success: true, message: "User berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};