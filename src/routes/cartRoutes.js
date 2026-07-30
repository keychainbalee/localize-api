import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  getMyCart, 
  addToCart, 
  updateCartItem, 
  removeCartItem, 
  clearMyCart 
} from "../controllers/cartController.js";

const router = Router();

router.get("/", authenticateToken, getMyCart);
router.post("/", authenticateToken, addToCart);
router.put("/:id", authenticateToken, updateCartItem);
router.delete("/:id", authenticateToken, removeCartItem);
router.delete("/", authenticateToken, clearMyCart);

export default router;
