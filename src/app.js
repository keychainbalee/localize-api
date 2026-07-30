import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Static Folder
app.use(express.static(path.join(__dirname, "../public")));

app.get("/docs", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Mounting Routes API
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users/locations", locationRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/cart", cartRoutes);

export default app;