import { Router } from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  createOrder, 
  getMyOrders,
  getAdminOrders, 
  getOrderById, 
  updateOrderStatus, 
  deleteOrder,
  uploadPaymentProof,
  cancelMyOrder
} from "../controllers/orderController.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/", authenticateToken, createOrder);
router.get("/my-orders", authenticateToken, getMyOrders);
router.get("/admin", authenticateToken, getAdminOrders);
router.get("/:id", authenticateToken, getOrderById);
router.post("/:id/payment-proof", authenticateToken, upload.single("imageFile"), uploadPaymentProof);
router.post("/:id/cancel", authenticateToken, cancelMyOrder);
router.put("/:id/status", authenticateToken, updateOrderStatus);
router.delete("/:id", authenticateToken, deleteOrder);

export default router;