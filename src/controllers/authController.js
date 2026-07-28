import { db } from "../config/db.js";

export const register = async (req, res) => {
  const { fullName, email, phoneNumber, password } = req.body;

  if (!fullName || !email || !phoneNumber || !password) {
    return res.status(400).json({ success: false, message: "Semua field harus diisi" });
  }

  try {
    const result = await db.execute({
      sql: `INSERT INTO users (full_name, email, phone_number, password_hash) 
            VALUES (?, ?, ?, ?) RETURNING id, full_name, email, role`,
      args: [fullName, email, phoneNumber, password],
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

    res.json({
      success: true,
      message: "Login berhasil",
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};