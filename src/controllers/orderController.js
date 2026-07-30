import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { orders, orderItems, products, userLocations, storeSettings, users } from "../config/schema.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius bumi dalam km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Fungsi pembantu untuk membatalkan pesanan yang melebihi batas waktu 24 jam secara otomatis
const checkAndExpireOrders = async () => {
  try {
    const now = new Date().toISOString();
    
    // Cari semua order dengan status 'dipesan' yang sudah melewati batas expiresAt
    const expiredOrders = await db.select()
      .from(orders)
      .where(and(
        eq(orders.status, "dipesan"),
        sql`expires_at < ${now}`
      ));

    for (const order of expiredOrders) {
      // 1. Ubah status pesanan menjadi "batal" (hangus)
      await db.update(orders)
        .set({ status: "batal" })
        .where(eq(orders.id, order.id));

      // 2. Kembalikan stok item sepatu yang dipesan ke katalog produk & kurangi jumlah terjual
      const itemsList = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      for (const item of itemsList) {
        const prodResult = await db.select().from(products).where(eq(products.id, item.productId));
        if (prodResult.length > 0) {
          const product = prodResult[0];
          const sizeStockObj = JSON.parse(product.sizeStock || "{}");
          sizeStockObj[item.size] = (Number(sizeStockObj[item.size]) || 0) + item.quantity;
          const newTotalStock = Object.values(sizeStockObj).reduce((acc, curr) => acc + Number(curr), 0);
          const newSoldCount = Math.max(0, (product.soldCount || 0) - item.quantity);

          await db.update(products)
            .set({
              sizeStock: JSON.stringify(sizeStockObj),
              stock: newTotalStock,
              soldCount: newSoldCount
            })
            .where(eq(products.id, item.productId));
        }
      }
      console.log(`❌ Pesanan #${order.id} otomatis hangus, stok dikembalikan, dan jumlah terjual dikurangi karena melebihi batas waktu 24 jam.`);
    }
  } catch (err) {
    console.error("Gagal melakukan pengecekan pesanan hangus:", err.message);
  }
};

export const createOrder = async (req, res) => {
  const userId = req.user ? req.user.id : req.body.userId;
  let { locationId, totalAmount, shippingAddress, addressNotes, latitude, longitude, items } = req.body;

  if (locationId) {
    const locResult = await db.select().from(userLocations)
      .where(and(
        eq(userLocations.id, Number(locationId)),
        eq(userLocations.userId, Number(userId))
      ));

    if (locResult.length > 0) {
      const loc = locResult[0];
      shippingAddress = loc.addressText;
      addressNotes = loc.addressNotes;
      latitude = loc.latitude;
      longitude = loc.longitude;
    }
  }

  if (!userId || !shippingAddress || !items || items.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Data pemesanan, alamat, dan item sepatu wajib diisi" 
    });
  }

  try {
    let itemsSubtotal = 0;
    
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const prodResult = await db.select().from(products).where(eq(products.id, Number(item.productId)));

      if (prodResult.length === 0) {
        return res.status(404).json({ success: false, message: `Produk ID ${item.productId} tidak ditemukan` });
      }

      const product = prodResult[0];
      const sizeStockObj = JSON.parse(product.sizeStock || "{}");
      const currentSizeStock = Number(sizeStockObj[item.size] || 0);

      if (currentSizeStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Stok untuk ${product.name} ukuran ${item.size} tidak mencukupi (Diminta: ${qty}, Tersisa: ${currentSizeStock})`
        });
      }
      
      itemsSubtotal += product.price * qty;
    }

    let distance = 0;
    let shippingFee = 0;

    if (latitude && longitude && Number(latitude) !== 0 && Number(longitude) !== 0) {
      const storeResult = await db.select().from(storeSettings).where(eq(storeSettings.id, 1));
      if (storeResult.length > 0) {
        const store = storeResult[0];
        distance = calculateDistance(Number(latitude), Number(longitude), store.latitude, store.longitude);
        shippingFee = distance * store.shippingFeePerKm;
      }
    }

    const finalTotalAmount = itemsSubtotal + shippingFee;
    
    // Set batas waktu pembayaran (24 jam dari sekarang)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const orderResult = await db.insert(orders).values({
      userId: Number(userId),
      totalAmount: finalTotalAmount,
      shippingAddress,
      addressNotes: addressNotes || "",
      latitude: latitude ? Number(latitude) : 0,
      longitude: longitude ? Number(longitude) : 0,
      distance,
      shippingFee,
      status: "dipesan",
      expiresAt
    }).returning();

    const orderId = orderResult[0].id;

    for (const item of items) {
      const qty = Number(item.quantity) || 1;

      await db.insert(orderItems).values({
        orderId,
        productId: Number(item.productId),
        size: item.size,
        quantity: qty,
        priceAtPurchase: Number(item.price)
      });

      const prodResult = await db.select().from(products).where(eq(products.id, Number(item.productId)));
      const product = prodResult[0];
      const sizeStockObj = JSON.parse(product.sizeStock || "{}");

      sizeStockObj[item.size] = Number(sizeStockObj[item.size]) - qty;
      const newTotalStock = Object.values(sizeStockObj).reduce((acc, curr) => acc + Number(curr), 0);
      const newSoldCount = (product.soldCount || 0) + qty;

      await db.update(products)
        .set({
          sizeStock: JSON.stringify(sizeStockObj),
          stock: newTotalStock,
          soldCount: newSoldCount
        })
        .where(eq(products.id, Number(item.productId)));
    }

    res.status(201).json({
      success: true,
      message: "Pesanan berhasil dibuat! Silakan unggah bukti pembayaran sebelum 24 jam.",
      orderId,
      distance: Number(distance.toFixed(2)),
      shippingFee: Math.round(shippingFee),
      totalAmount: finalTotalAmount,
      expiresAt
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyOrders = async (req, res) => {
  const userId = req.user.id;

  try {
    // Jalankan pengecekan order kedaluwarsa secara otomatis
    await checkAndExpireOrders();

    const result = await db.select({
      order_id: orders.id,
      total_amount: orders.totalAmount,
      shipping_address: orders.shippingAddress,
      address_notes: orders.addressNotes,
      latitude: orders.latitude,
      longitude: orders.longitude,
      distance: orders.distance,
      shipping_fee: orders.shippingFee,
      status: orders.status,
      payment_proof_url: orders.paymentProofUrl,
      expires_at: orders.expiresAt,
      created_at: orders.createdAt,
      ordered_size: orderItems.size,
      ordered_quantity: orderItems.quantity,
      product_name: products.name,
      product_image: products.imageUrl
    })
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orders.userId, Number(userId)))
    .orderBy(desc(orders.createdAt));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAdminOrders = async (req, res) => {
  try {
    // Jalankan pengecekan order kedaluwarsa secara otomatis
    await checkAndExpireOrders();

    const result = await db.select({
      order_id: orders.id,
      customer_name: users.fullName,
      phone_number: users.phoneNumber,
      total_amount: orders.totalAmount,
      shipping_address: orders.shippingAddress,
      address_notes: orders.addressNotes,
      latitude: orders.latitude,
      longitude: orders.longitude,
      distance: orders.distance,
      shipping_fee: orders.shippingFee,
      status: orders.status,
      payment_proof_url: orders.paymentProofUrl,
      expires_at: orders.expiresAt,
      created_at: orders.createdAt,
      ordered_size: orderItems.size,
      ordered_quantity: orderItems.quantity,
      product_name: products.name
    })
    .from(orders)
    .join(users, eq(orders.userId, users.id))
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .orderBy(desc(orders.createdAt));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    // Jalankan pengecekan order kedaluwarsa secara otomatis
    await checkAndExpireOrders();

    const orderResult = await db.select({
      id: orders.id,
      user_id: orders.userId,
      total_amount: orders.totalAmount,
      shipping_address: orders.shippingAddress,
      address_notes: orders.addressNotes,
      latitude: orders.latitude,
      longitude: orders.longitude,
      distance: orders.distance,
      shipping_fee: orders.shippingFee,
      status: orders.status,
      payment_proof_url: orders.payment_proof_url,
      expires_at: orders.expires_at,
      created_at: orders.createdAt,
      full_name: users.fullName,
      phone_number: users.phoneNumber
    })
    .from(orders)
    .join(users, eq(orders.userId, users.id))
    .where(eq(orders.id, Number(id)));

    if (orderResult.length === 0) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    const itemsResult = await db.select({
      id: orderItems.id,
      order_id: orderItems.orderId,
      product_id: orderItems.productId,
      size: orderItems.size,
      quantity: orderItems.quantity,
      price_at_purchase: orderItems.priceAtPurchase,
      product_name: products.name,
      image_url: products.imageUrl
    })
    .from(orderItems)
    .join(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, Number(id)));

    const formattedItems = itemsResult.map(item => ({
      id: item.id,
      order_id: item.order_id,
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity,
      price_at_purchase: item.price_at_purchase,
      product_name: item.product_name,
      image_url: item.image_url
    }));

    const orderData = orderResult[0];
    res.json({
      success: true,
      data: {
        id: orderData.id,
        user_id: orderData.user_id,
        total_amount: orderData.total_amount,
        shipping_address: orderData.shipping_address,
        address_notes: orderData.address_notes,
        latitude: orderData.latitude,
        longitude: orderData.longitude,
        distance: orderData.distance,
        shipping_fee: orderData.shipping_fee,
        status: orderData.status,
        payment_proof_url: orderData.payment_proof_url,
        expires_at: orderData.expires_at,
        created_at: orderData.created_at,
        full_name: orderData.full_name,
        phone_number: orderData.phone_number,
        items: formattedItems
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// [POST] Unggah Bukti Pembayaran (Maksimal 24 jam sejak order dibuat)
export const uploadPaymentProof = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Bukti pembayaran berupa gambar wajib diunggah" });
  }

  try {
    const orderResult = await db.select().from(orders).where(and(
      eq(orders.id, Number(id)),
      eq(orders.userId, Number(userId))
    ));

    if (orderResult.length === 0) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    const orderData = orderResult[0];

    // Cek apakah status pesanan sudah dibatalkan/hangus
    if (orderData.status === "batal") {
      return res.status(400).json({ 
        success: false, 
        message: "Pesanan ini sudah hangus karena melebihi batas waktu pembayaran 24 jam" 
      });
    }

    // Unggah gambar ke Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer);
    const paymentProofUrl = uploadResult.secure_url;

    // Update status menjadi 'dibayar' dan catat link gambarnya
    await db.update(orders)
      .set({
        status: "dibayar",
        paymentProofUrl
      })
      .where(eq(orders.id, Number(id)));

    res.json({
      success: true,
      message: "Bukti transfer berhasil diunggah. Status pesanan diubah menjadi 'dibayar'.",
      paymentProofUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["dipesan", "dibayar", "dikirim", "selesai", "batal"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: `Status tidak valid. Gunakan salah satu dari: ${validStatuses.join(", ")}` 
    });
  }

  try {
    const result = await db.update(orders)
      .set({ status })
      .where(eq(orders.id, Number(id)));

    res.json({ success: true, message: `Status pesanan #${id} diubah menjadi '${status}'` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    await db.delete(orderItems).where(eq(orderItems.orderId, Number(id)));
    const result = await db.delete(orders).where(eq(orders.id, Number(id)));

    res.json({ success: true, message: "Pesanan berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};