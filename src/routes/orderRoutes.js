import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  createOrder, 
  getMyOrders,
  getAdminOrders, 
  getOrderById, 
  updateOrderStatus, 
  deleteOrder 
} from "../controllers/orderController.js";

const router = Router();

router.post("/", authenticateToken, createOrder);
router.get("/my-orders", authenticateToken, getMyOrders);
router.get("/admin", authenticateToken, getAdminOrders);
router.get("/:id", authenticateToken, getOrderById);
router.put("/:id/status", authenticateToken, updateOrderStatus);
router.delete("/:id", authenticateToken, deleteOrder);

export default router;