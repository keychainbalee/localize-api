import { Router } from "express";
import { createOrder, getAdminOrders } from "../controllers/orderController.js";

const router = Router();

router.post("/", createOrder);
router.get("/admin", getAdminOrders);

// Pastikan baris export default ini ada di bagian paling bawah
export default router;