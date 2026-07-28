import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  register, 
  login, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/users", authenticateToken, getUsers);
router.get("/users/:id", authenticateToken, getUserById);
router.put("/users/:id", authenticateToken, updateUser);
router.delete("/users/:id", authenticateToken, deleteUser);

export default router;