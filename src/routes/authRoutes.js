import { Router } from "express";
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
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;