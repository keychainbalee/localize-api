import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { getStoreSettings, updateStoreSettings } from "../controllers/storeController.js";

const router = Router();

router.get("/", getStoreSettings);
router.put("/", authenticateToken, updateStoreSettings);

export default router;
