import { desc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { products } from "../config/schema.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

export const getProducts = async (req, res) => {
  try {
    const result = await db.select().from(products).orderBy(desc(products.id));
    const formatted = result.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      size_stock: JSON.parse(p.sizeStock || "{}"),
      image_url: p.imageUrl,
      created_at: p.createdAt
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.select().from(products).where(eq(products.id, Number(id)));

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const p = result[0];
    const formatted = {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      size_stock: JSON.parse(p.sizeStock || "{}"),
      image_url: p.imageUrl,
      created_at: p.createdAt
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createProduct = async (req, res) => {
  const { name, description, price, sizeStock, imageUrl } = req.body;

  if (!name || !price) {
    return res.status(400).json({ success: false, message: "Nama dan harga wajib diisi" });
  }

  try {
    let finalImageUrl = imageUrl || "";

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      finalImageUrl = uploadResult.secure_url;
    }

    let sizeStockObj = {};
    if (typeof sizeStock === "string") {
      sizeStockObj = JSON.parse(sizeStock);
    } else if (typeof sizeStock === "object") {
      sizeStockObj = sizeStock;
    }

    const totalStock = Object.values(sizeStockObj).reduce((acc, curr) => acc + Number(curr), 0);

    const result = await db.insert(products).values({
      name,
      description: description || "",
      price: Number(price),
      stock: totalStock,
      sizeStock: JSON.stringify(sizeStockObj),
      imageUrl: finalImageUrl
    }).returning();

    const p = result[0];
    const formatted = {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      size_stock: sizeStockObj,
      image_url: p.imageUrl,
      created_at: p.createdAt
    };

    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan",
      data: formatted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, sizeStock, imageUrl } = req.body;

  try {
    const checkProduct = await db.select().from(products).where(eq(products.id, Number(id)));

    if (checkProduct.length === 0) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const existingProduct = checkProduct[0];
    let finalImageUrl = imageUrl || existingProduct.imageUrl;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      finalImageUrl = uploadResult.secure_url;
    }

    let sizeStockObj = JSON.parse(existingProduct.sizeStock || "{}");
    if (sizeStock) {
      sizeStockObj = typeof sizeStock === "string" ? JSON.parse(sizeStock) : sizeStock;
    }

    const totalStock = Object.values(sizeStockObj).reduce((acc, curr) => acc + Number(curr), 0);

    await db.update(products)
      .set({
        name: name || existingProduct.name,
        description: description !== undefined ? description : existingProduct.description,
        price: price ? Number(price) : existingProduct.price,
        stock: totalStock,
        sizeStock: JSON.stringify(sizeStockObj),
        imageUrl: finalImageUrl
      })
      .where(eq(products.id, Number(id)));

    res.json({ success: true, message: "Data produk berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.delete(products).where(eq(products.id, Number(id)));

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};