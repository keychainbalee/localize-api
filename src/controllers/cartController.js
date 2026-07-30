import { eq, and } from "drizzle-orm";
import { db } from "../config/db.js";
import { cartItems, products } from "../config/schema.js";

// [GET] Ambil Daftar Cart Milik User
export const getMyCart = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.select({
      id: cartItems.id,
      user_id: cartItems.userId,
      product_id: cartItems.productId,
      size: cartItems.size,
      quantity: cartItems.quantity,
      created_at: cartItems.createdAt,
      product_name: products.name,
      product_price: products.price,
      product_image: products.imageUrl
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, Number(userId)));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [POST] Tambah Item ke Cart (atau update quantity jika item & size sama sudah ada)
export const addToCart = async (req, res) => {
  const userId = req.user.id;
  const { productId, size, quantity } = req.body;

  const qty = Number(quantity) || 1;

  if (!productId || !size) {
    return res.status(400).json({ success: false, message: "Product ID dan ukuran (size) wajib diisi" });
  }

  try {
    // 1. Validasi produk & stok
    const prodResult = await db.select().from(products).where(eq(products.id, Number(productId)));
    if (prodResult.length === 0) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const product = prodResult[0];
    const sizeStockObj = JSON.parse(product.sizeStock || "{}");
    const currentSizeStock = Number(sizeStockObj[size] || 0);

    if (currentSizeStock === 0) {
      return res.status(400).json({ success: false, message: `Stok untuk ukuran ${size} kosong / tidak tersedia` });
    }

    // 2. Periksa apakah item dengan product & size yang sama sudah ada di cart user
    const checkItem = await db.select().from(cartItems)
      .where(and(
        eq(cartItems.userId, Number(userId)),
        eq(cartItems.productId, Number(productId)),
        eq(cartItems.size, size)
      ));

    if (checkItem.length > 0) {
      const existingItem = checkItem[0];
      const newQty = existingItem.quantity + qty;

      if (newQty > currentSizeStock) {
        return res.status(400).json({ 
          success: false, 
          message: `Stok tidak mencukupi untuk menambah jumlah cart (Di cart: ${existingItem.quantity}, Stok tersedia: ${currentSizeStock})` 
        });
      }

      await db.update(cartItems)
        .set({ quantity: newQty })
        .where(eq(cartItems.id, existingItem.id));

      return res.json({ success: true, message: "Kuantitas item di keranjang berhasil diperbarui" });
    }

    // 3. Masukkan item baru ke cart
    if (qty > currentSizeStock) {
      return res.status(400).json({ 
        success: false, 
        message: `Stok tidak mencukupi (Diminta: ${qty}, Tersisa: ${currentSizeStock})` 
      });
    }

    await db.insert(cartItems).values({
      userId: Number(userId),
      productId: Number(productId),
      size,
      quantity: qty
    });

    res.status(201).json({ success: true, message: "Item berhasil ditambahkan ke keranjang" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [PUT] Update Kuantitas Cart Item by ID
export const updateCartItem = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { quantity } = req.body;

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ success: false, message: "Kuantitas harus berupa angka positif" });
  }

  try {
    const checkItem = await db.select().from(cartItems)
      .where(and(
        eq(cartItems.id, Number(id)),
        eq(cartItems.userId, Number(userId))
      ));

    if (checkItem.length === 0) {
      return res.status(404).json({ success: false, message: "Item keranjang tidak ditemukan" });
    }

    const item = checkItem[0];

    // Validasi stok produk terbaru
    const prodResult = await db.select().from(products).where(eq(products.id, item.productId));
    const product = prodResult[0];
    const sizeStockObj = JSON.parse(product.sizeStock || "{}");
    const currentSizeStock = Number(sizeStockObj[item.size] || 0);

    if (qty > currentSizeStock) {
      return res.status(400).json({ 
        success: false, 
        message: `Stok tidak mencukupi (Diminta: ${qty}, Tersedia: ${currentSizeStock})` 
      });
    }

    await db.update(cartItems)
      .set({ quantity: qty })
      .where(eq(cartItems.id, Number(id)));

    res.json({ success: true, message: "Jumlah item keranjang berhasil diubah" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [DELETE] Hapus Satu Item dari Cart
export const removeCartItem = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await db.delete(cartItems)
      .where(and(
        eq(cartItems.id, Number(id)),
        eq(cartItems.userId, Number(userId))
      ));

    res.json({ success: true, message: "Item keranjang berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [DELETE] Bersihkan Semua Isi Cart Milik User
export const clearMyCart = async (req, res) => {
  const userId = req.user.id;

  try {
    await db.delete(cartItems).where(eq(cartItems.userId, Number(userId)));
    res.json({ success: true, message: "Seluruh keranjang belanja berhasil dikosongkan" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
