import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Multer disk storage for chat files (saved to /uploads/chat)
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const uploadDir = path.join(process.cwd(), "uploads", "chat");
		try {
			fs.mkdirSync(uploadDir, { recursive: true });
		} catch (err) {
			// ignore, will be handled by cb
		}
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
		const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
		cb(null, fileName);
	},
});

// Limit: 50MB per file (adjust if needed)
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// POST /chat/upload
// field name: `file`
router.post("/chat/upload", upload.single("file"), (req, res) => {
	try {
		if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

		// debug log
		console.log("Chat upload received:", {
			originalname: req.file.originalname,
			filename: req.file.filename,
			size: req.file.size,
			mimetype: req.file.mimetype,
		});

		// Serve path under /uploads (server.js already exposes /uploads)
		const filePath = `/uploads/chat/${req.file.filename}`;

		return res.json({ success: true, filePath, fileName: req.file.originalname });
	} catch (err) {
		console.error("Error on chat file upload:", err);
		return res.status(500).json({ success: false, error: err?.message || "Upload failed" });
	}
});

export default router;

