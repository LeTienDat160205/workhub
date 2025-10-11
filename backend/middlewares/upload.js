import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: file.fieldname === "avatar" ? "workhub/avatars" : "workhub/backgrounds",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    public_id: `${file.fieldname}_${Date.now()}`,
  }),
});

const upload = multer({ storage });

export default upload;
