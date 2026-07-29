import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  getMyLocations, 
  addLocation, 
  updateLocation, 
  deleteLocation 
} from "../controllers/locationController.js";

const router = Router();

router.use(authenticateToken); // Semua endpoint lokasi membutuhkan JWT Login

router.get("/", getMyLocations);
router.post("/", addLocation);
router.put("/:id", updateLocation);
router.delete("/:id", deleteLocation);

export default router;