import { Router } from "express";
import multer from "multer";
import { 
  getProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from "../controllers/productController.js";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", upload.single("imageFile"), createProduct);
router.put("/:id", upload.single("imageFile"), updateProduct);
router.delete("/:id", deleteProduct);

export default router;