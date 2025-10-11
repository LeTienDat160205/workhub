import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Avatar upload
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "avatars", // thư mục trên Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill" }],
  },
});

// Background upload
const backgroundStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "backgrounds",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 600, crop: "fill" }],
  },
});

export const uploadAvatar = multer({ storage: avatarStorage });
export const uploadBackground = multer({ storage: backgroundStorage });
