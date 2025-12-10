import multer from "multer";
import path from "path";
import fs from "fs";

// Disk storage for task files (attachments & submissions)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save all task-related files under /uploads/tasks
    const uploadDir = path.join(process.cwd(), "uploads", "tasks");
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (err) {
      // ignore
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
    cb(null, fileName);
  },
});

// No strict file type restrictions here — tasks may accept any file types.
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB

export default upload;
