import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { users, userLocations } from "../config/schema.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
    process.env.JWT_SECRET || "default_jwt_secret",
    { expiresIn: "7d" }
  );
};

export const register = async (req, res) => {
  const { fullName, email, phoneNumber, password, role, addressText, latitude, longitude } = req.body;

  if (!fullName || !email || !phoneNumber || !password) {
    return res.status(400).json({ success: false, message: "Semua field wajib diisi" });
  }

  try {
    let finalImageUrl = null;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      finalImageUrl = uploadResult.secure_url;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await db.insert(users).values({
      fullName,
      email,
      phoneNumber,
      passwordHash,
      role: role || "customer",
      imageUrl: finalImageUrl
    }).returning();

    const user = result[0];
    delete user.passwordHash;

    if (addressText) {
      await db.insert(userLocations).values({
        userId: user.id,
        label: "Rumah",
        addressText,
        addressNotes: "",
        latitude: latitude ? Number(latitude) : 0,
        longitude: longitude ? Number(longitude) : 0,
        isPrimary: 1
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.select().from(users).where(eq(users.email, email));

    if (result.length === 0) {
      return res.status(401).json({ success: false, message: "Email atau password salah" });
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Email atau password salah" });
    }

    delete user.passwordHash;

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Login berhasil",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const result = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      role: users.role,
      imageUrl: users.imageUrl,
      createdAt: users.createdAt
    }).from(users);

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phoneNumber: users.phoneNumber,
      role: users.role,
      imageUrl: users.imageUrl,
      createdAt: users.createdAt
    }).from(users).where(eq(users.id, Number(id)));

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    res.json({ success: true, data: result[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, phoneNumber, role, imageUrl } = req.body;

  try {
    const userCheck = await db.select().from(users).where(eq(users.id, Number(id)));
    if (userCheck.length === 0) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    let finalImageUrl = imageUrl || userCheck[0].imageUrl;
    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      finalImageUrl = uploadResult.secure_url;
    }

    const result = await db.update(users)
      .set({ 
        fullName: fullName || userCheck[0].fullName, 
        phoneNumber: phoneNumber || userCheck[0].phoneNumber, 
        role: role || userCheck[0].role,
        imageUrl: finalImageUrl
      })
      .where(eq(users.id, Number(id)));

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    res.json({ success: true, message: "Profil user berhasil diperbarui", imageUrl: finalImageUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.delete(users).where(eq(users.id, Number(id)));

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "User tidak ditemukan" });
    }

    res.json({ success: true, message: "User berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};