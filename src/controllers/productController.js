import { db } from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

export const getProducts = async (req, res) => {
  try {
    const result = await db.execute("SELECT * FROM products ORDER BY id DESC");
    const products = result.rows.map(p => ({
      ...p,
      size_stock: JSON.parse(p.size_stock || "{}")
    }));
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [req.params.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const product = result.rows[0];
    product.size_stock = JSON.parse(product.size_stock || "{}");

    res.json({ success: true, data: product });
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

    const result = await db.execute({
      sql: `INSERT INTO products (name, description, price, stock, size_stock, image_url) 
            VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        name,
        description || "",
        price,
        totalStock,
        JSON.stringify(sizeStockObj),
        finalImageUrl,
      ],
    });

    res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan",
      data: {
        ...result.rows[0],
        size_stock: sizeStockObj,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, sizeStock, imageUrl } = req.body;

  try {
    const checkProduct = await db.execute({
      sql: "SELECT * FROM products WHERE id = ?",
      args: [id],
    });

    if (checkProduct.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const existingProduct = checkProduct.rows[0];
    let finalImageUrl = imageUrl || existingProduct.image_url;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer);
      finalImageUrl = uploadResult.secure_url;
    }

    let sizeStockObj = JSON.parse(existingProduct.size_stock || "{}");
    if (sizeStock) {
      sizeStockObj = typeof sizeStock === "string" ? JSON.parse(sizeStock) : sizeStock;
    }

    const totalStock = Object.values(sizeStockObj).reduce((acc, curr) => acc + Number(curr), 0);

    await db.execute({
      sql: `UPDATE products 
            SET name = ?, description = ?, price = ?, stock = ?, size_stock = ?, image_url = ? 
            WHERE id = ?`,
      args: [
        name || existingProduct.name,
        description !== undefined ? description : existingProduct.description,
        price || existingProduct.price,
        totalStock,
        JSON.stringify(sizeStockObj),
        finalImageUrl,
        id,
      ],
    });

    res.json({ success: true, message: "Data produk berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.execute({
      sql: "DELETE FROM products WHERE id = ?",
      args: [id],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};