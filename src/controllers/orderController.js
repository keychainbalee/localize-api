import { db } from "../config/db.js";

export const createOrder = async (req, res) => {
  const userId = req.user ? req.user.id : req.body.userId;
  const { totalAmount, shippingAddress, addressNotes, latitude, longitude, items } = req.body;

  if (!userId || !totalAmount || !shippingAddress || !items || items.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Data pemesanan, alamat, dan item sepatu wajib diisi" 
    });
  }

  try {
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const prodResult = await db.execute({
        sql: "SELECT * FROM products WHERE id = ?",
        args: [item.productId],
      });

      if (prodResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: `Produk ID ${item.productId} tidak ditemukan` });
      }

      const product = prodResult.rows[0];
      const sizeStockObj = JSON.parse(product.size_stock || "{}");
      const currentSizeStock = Number(sizeStockObj[item.size] || 0);

      if (currentSizeStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Stok untuk ${product.name} ukuran ${item.size} tidak mencukupi (Diminta: ${qty}, Tersisa: ${currentSizeStock})`
        });
      }
    }

    const orderResult = await db.execute({
      sql: `INSERT INTO orders (user_id, total_amount, shipping_address, address_notes, latitude, longitude, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'dipesan') RETURNING id`,
      args: [userId, totalAmount, shippingAddress, addressNotes || "", latitude || 0, longitude || 0],
    });

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const qty = Number(item.quantity) || 1;

      await db.execute({
        sql: `INSERT INTO order_items (order_id, product_id, size, quantity, price_at_purchase) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [orderId, item.productId, item.size, qty, item.price],
      });

      const prodResult = await db.execute({
        sql: "SELECT * FROM products WHERE id = ?",
        args: [item.productId],
      });
      const product = prodResult.rows[0];
      const sizeStockObj = JSON.parse(product.size_stock || "{}");

      sizeStockObj[item.size] = Number(sizeStockObj[item.size]) - qty;
      const newTotalStock = Object.values(sizeStockObj).reduce((acc, curr) => acc + Number(curr), 0);

      await db.execute({
        sql: "UPDATE products SET size_stock = ?, stock = ? WHERE id = ?",
        args: [JSON.stringify(sizeStockObj), newTotalStock, item.productId],
      });
    }

    res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat & stok otomatis berkurang!",
      orderId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyOrders = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.execute({
      sql: `
        SELECT 
          o.id AS order_id,
          o.total_amount,
          o.shipping_address,
          o.address_notes,
          o.latitude,
          o.longitude,
          o.status,
          o.created_at,
          oi.size AS ordered_size,
          oi.quantity AS ordered_quantity,
          p.name AS product_name,
          p.image_url AS product_image
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
      `,
      args: [userId],
    });

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        o.id AS order_id,
        u.full_name AS customer_name,
        u.phone_number,
        o.total_amount,
        o.shipping_address,
        o.address_notes,
        o.latitude,
        o.longitude,
        o.status,
        o.created_at,
        oi.size AS ordered_size,
        oi.quantity AS ordered_quantity,
        p.name AS product_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      ORDER BY o.created_at DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const orderResult = await db.execute({
      sql: `SELECT o.*, u.full_name, u.phone_number FROM orders o JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
      args: [id],
    });

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    const itemsResult = await db.execute({
      sql: `SELECT oi.*, p.name AS product_name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`,
      args: [id],
    });

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["dipesan", "dibayar", "dikirim", "selesai"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: `Status tidak valid. Gunakan salah satu dari: ${validStatuses.join(", ")}` 
    });
  }

  try {
    const result = await db.execute({
      sql: "UPDATE orders SET status = ? WHERE id = ?",
      args: [status, id],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    res.json({ success: true, message: `Status pesanan #${id} diubah menjadi '${status}'` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    await db.execute({ sql: "DELETE FROM order_items WHERE order_id = ?", args: [id] });
    const result = await db.execute({ sql: "DELETE FROM orders WHERE id = ?", args: [id] });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    res.json({ success: true, message: "Pesanan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};