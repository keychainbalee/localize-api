import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  phoneNumber: text("phone_number").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("customer"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});

export const userLocations = sqliteTable("user_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").default("Rumah"),
  addressText: text("address_text").notNull(),
  addressNotes: text("address_notes"),
  latitude: real("latitude").default(0),
  longitude: real("longitude").default(0),
  isPrimary: integer("is_primary").default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  stock: integer("stock").default(0),
  sizeStock: text("size_stock").default("{}"),
  imageUrl: text("image_url"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  totalAmount: real("total_amount").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  addressNotes: text("address_notes"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  distance: real("distance").default(0),
  shippingFee: real("shipping_fee").default(0),
  status: text("status").default("dipesan"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  quantity: integer("quantity").default(1),
  priceAtPurchase: real("price_at_purchase").notNull()
});

export const storeSettings = sqliteTable("store_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").default("Toko Utama"),
  address: text("address").notNull(),
  latitude: real("latitude").default(0),
  longitude: real("longitude").default(0),
  shippingFeePerKm: real("shipping_fee_per_km").default(2000)
});

export const cartItems = sqliteTable("cart_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  size: text("size").notNull(),
  quantity: integer("quantity").default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});
