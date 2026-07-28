import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Token autentikasi JWT tidak ditemukan.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret", (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Token tidak valid atau telah kadaluwarsa.",
      });
    }

    req.user = user;
    next();
  });
};