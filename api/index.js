import app from "../src/app.js";
import dotenv from "dotenv";

dotenv.config();

// Running lokal di port 3000
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  });
}

// Export modul Express untuk Vercel Serverless Function
export default app;