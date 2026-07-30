import app from "../src/app.js";
import dotenv from "dotenv";

dotenv.config();

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

export default app;