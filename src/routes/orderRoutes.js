import { Router } from "express";
import { 
  createOrder, 
  getAdminOrders, 
  getOrderById, 
  updateOrderStatus, 
  deleteOrder 
} from "../controllers/orderController.js";

const router = Router();

router.post("/", createOrder);
router.get("/admin", getAdminOrders);
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);

export default router;