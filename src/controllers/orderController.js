import { db } from "../config/db.js";

export const createOrder = async (req, res) => {
  const { userId, totalAmount, shippingAddress, latitude, longitude, items } = req.body;

  if (!userId || !totalAmount || !shippingAddress || latitude == null || longitude == null) {
    return res.status(400).json({ 
      success: false, 
      message: "Data pemesanan dan koordinat GPS lokasi rumah wajib diisi" 
    });
  }

  try {
    const orderResult = await db.execute({
      sql: `INSERT INTO orders (user_id, total_amount, shipping_address, latitude, longitude) 
            VALUES (?, ?, ?, ?, ?) RETURNING id`,
      args: [userId, totalAmount, shippingAddress, latitude, longitude],
    });

    const orderId = orderResult.rows[0].id;

    // 2. Simpan Item Sepatu yang Dibeli
    if (items && items.length > 0) {
      for (const item of items) {
        await db.execute({
          sql: `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
                VALUES (?, ?, ?, ?)`,
          args: [orderId, item.productId, item.quantity, item.price],
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat!",
      orderId,
    });
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
        o.latitude,
        o.longitude,
        o.status,
        o.created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};