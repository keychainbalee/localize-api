import { Router } from "express";
import multer from "multer";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  register, 
  login, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} from "../controllers/authController.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/register", upload.single("imageFile"), register);
router.post("/login", login);
router.get("/users", authenticateToken, getUsers);
router.get("/users/:id", authenticateToken, getUserById);
router.put("/users/:id", authenticateToken, upload.single("imageFile"), updateUser);
router.delete("/users/:id", authenticateToken, deleteUser);

export default router;