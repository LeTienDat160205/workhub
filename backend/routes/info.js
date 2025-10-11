// ============================== IMPORTS ==============================
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import db from "../db.js";
import { v7 as uuidv7 } from "uuid";
import { body, validationResult } from "express-validator";
import upload from "../middlewares/upload.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";

const router = express.Router();

// ============================== MIDDLEWARE ==============================
// Kiểm tra đảm bảo đã đăng nhập
function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.redirect("/login");
  next();
}

// ============================== Lấy thông tin từ db ==============================
router.get("/info", ensureAuth, async (req, res) => {
  try {
    // mong req.session.user.id là UUID string 
    const userId = req.session.user && req.session.user.id;
    if (!userId) return res.redirect("/login");

    // Lấy thông tin user, chuyển id về chuỗi UUID để dễ debug
    // Lưu ý: nếu bạn lưu id dưới dạng BINARY(16) trong DB, dùng BIN_TO_UUID
    const sql = `SELECT BIN_TO_UUID(id) AS id, username, email, name, dob, gender, phoneNumber, address, avatarPath, backgroundPath FROM user WHERE id = UUID_TO_BIN(?) LIMIT 1`;
    
    const [rows] = await db.promise().query(sql, [userId]);

    if (!rows || rows.length === 0) {
      // user không tồn tại -> destroy session
      req.session.destroy(() => res.redirect("/auth/login"));
      return;
    }

    const user = rows[0];

    res.render("info", { user, error: null, success: null });
  } catch (err) {
    console.error("GET /info error:", err);
    res.status(500).send("Lỗi server");
  }
});

//  ============================== Cập nhật thông tin ==============================
router.post("/info",
  ensureAuth,
  // validation middleware (express-validator)
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "background", maxCount: 1 },
  ]),
  body("name").trim().isLength({ max: 100 }).optional({ nullable: true }),
  body("dob").optional({ nullable: true }).isISO8601().toDate(),
  body("gender").optional({ nullable: true }).isIn(["male", "female", "other"]),
  body("phoneNumber").optional({ nullable: true }).isLength({ max: 20 }),
  body("address").optional({ nullable: true }).isLength({ max: 255 }),

  async (req, res) => {
    const errors = validationResult(req);
    const formData = {
      name: req.body.name || null,
      dob: req.body.dob || null,
      gender: req.body.gender || null,
      phoneNumber: req.body.phoneNumber || null,
      address: req.body.address || null
    };

    if (!errors.isEmpty()) {
      // nếu validation fail -> render lại với lỗi
      return res.render("info", { user: { ...req.session.user, ...formData, dobString: formData.dob ? new Date(formData.dob).toISOString().slice(0,10) : "" }, error: errors.array()[0].msg, success: null });
    }

    // Lấy file upload từ Cloudinary
      const avatarUrl = req.files?.avatar
      ? req.files.avatar[0].path || req.files.avatar[0].url
      : req.session.user.avatarPath;

      const backgroundUrl = req.files?.background
      ? req.files.background[0].path || req.files.background[0].url
      : req.session.user.backgroundPath;


    try {
      const userId = req.session.user.id;
      const sql = `UPDATE user SET name = ?, dob = ?, gender = ?, phoneNumber = ?, address = ?, avatarPath=?, backgroundPath=? WHERE id = UUID_TO_BIN(?)`;
      await db.promise().query(sql, [formData.name, formData.dob || null, formData.gender, formData.phoneNumber, formData.address, avatarUrl, backgroundUrl, userId]);

      // cập nhật session 
      req.session.user = {
        ...req.session.user,
        name: formData.name,
        dob: formData.dob ,
        gender: formData.gender,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        avatarPath: avatarUrl,
        backgroundPath: backgroundUrl,
      };

      // Lấy lại user để render đầy đủ thông tin
      const [rows] = await db.promise().query("SELECT BIN_TO_UUID(id) AS id, username, email, name, dob, gender, phoneNumber, address, avatarPath, backgroundPath FROM user WHERE id = UUID_TO_BIN(?)", [userId]);
      const user = rows[0];
      if (user && user.dob && user.dob instanceof Date) user.dobString = user.dob.toISOString().slice(0,10);
      else user.dobString = user.dob || "";

      res.render("info", { user, error: null, success: "Cập nhật thông tin thành công" });
    } catch (err) {
      console.error("POST /info error:", err);
      res.status(500).render("info", { user: { ...req.session.user, ...formData }, error: "Lỗi khi cập nhật", success: null });
    }
  }
);

export default router;
