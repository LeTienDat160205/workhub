import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Middleware check đăng nhập
function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Tạo folder nếu chưa có
const uploadDir = "uploads/chat";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình lưu file vào uploads/chat
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // tối đa 50MB
});

// =========================== UPLOAD FILE ===========================
router.post("/upload", ensureAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Không có file nào được gửi." });
  }

  const filePath = "/uploads/chat/" + req.file.filename;

  return res.json({
    success: true,
    filePath,
    fileName: req.file.originalname,
    size: req.file.size
  });
});

export default router;
