// ============================== IMPORTS ==============================
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import db from "../config/db.js";
import { v7 as uuidv7 } from "uuid";
import upload from "../middlewares/upload.js";
import cloudinary from "../config/cloudinary.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import transporter from "../config/mailer.js";
dotenv.config();
const router = express.Router();

// ============================== ROUTES ==============================

// Trang đăng nhập
router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

// Trang đăng ký
router.get("/register", (req, res) => {
  res.render("register", { error: null });
});

// Trang quên mật khẩu
router.get("/forgot", (req, res) => {
  res.render("forgot", { error: null, success: null });
});
// ============================== ĐĂNG KÝ ==============================
router.post("/register", async (req, res) => {
  const { name, username, email, password, confirmPassword } = req.body;
  const formData = { name, username, email };

  // Kiem tra nhap du thong tin khong
  if (!name || !username || !email || !password || !confirmPassword) {
    return res.render("register", {
      error: "Vui lòng nhập đủ thông tin!",
      formData,
    });
  }

  // Username chỉ được chứa chữ cái, số và dấu gạch dưới, độ dài 3-50
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  if (!usernameRegex.test(username)) {
    return res.render("register", {
      error:
        "Username chỉ được chứa chữ, số, dấu gạch dưới (_) và dài 3-50 ký tự!",
      formData,
    });
  }

  // Regex kiem tra dinh dang email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render("register", {
      error:
        "Email không hợp lệ, vui lòng nhập đúng định dạng (vd: abc@example.com)!",
      formData,
    });
  }

  // regex kiem tra mk manh hay khong
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!strongRegex.test(password)) {
    return res.render("register", {
      error:
        "Mật khẩu phải >=8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt!",
      formData,
    });
  }

  if (password !== confirmPassword) {
    return res.render("register", {
      error: "Mật khẩu xác nhận không khớp!",
      formData,
    });
  }

  try {
    // Kiểm tra username/email tồn tại hay ko
    db.query(
      "SELECT * FROM user WHERE username = ? OR email = ?",
      [username, email],
      async (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Lỗi hệ thống");
        }

        // Kiểm tra username hoặc email đã tồn tại hay chưa
        if (results.length > 0) {
          const existsUsername = results.some((r) => r.username === username);
          const existsEmail = results.some((r) => r.email === email);
          let msg = "Username hoặc Email đã tồn tại, vui lòng chọn cái khác!";
          if (existsUsername && !existsEmail) msg = "Username đã tồn tại!";
          if (!existsUsername && existsEmail) msg = "Email đã tồn tại!";
          return res.render("register", { error: msg, formData });
        }

        // chưa tồn tại thì băm mk ra và nhét vào
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = uuidv7(); // tạo UUID v7

        const sql =
          "INSERT INTO `user` (id, username, email, password, name) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?)";

        db.query(
          sql,
          [id, username, email, hashedPassword, name],
          (err, result) => {
            if (err) {
              console.error(err);
              return res.status(500).send("Lỗi khi đăng ký");
            }
            res.redirect("/auth/login");
          }
        );
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi hệ thống");
  }
});

// ============================== ĐĂNG NHẬP ==============================
router.post("/login", (req, res) => {
  const { usernameOrEmail, password } = req.body;
  const formData = { usernameOrEmail };

  // Kiem tra nhap du thong tin khong
  if (!usernameOrEmail || !password) {
    return res.render("login", {
      error: "Vui lòng nhập đủ thông tin!",
      formData,
    });
  }

  // Kiem tra la username hay email
  const isEmail = usernameOrEmail.includes("@");

  const sql = isEmail
    ? "SELECT BIN_TO_UUID(id) AS id, username, email, password, name, dob, gender, phoneNumber, address, avatarPath, backgroundPath FROM user WHERE email = ?"
    : "SELECT BIN_TO_UUID(id) AS id, username, email, password, name, dob, gender, phoneNumber, address, avatarPath, backgroundPath FROM user WHERE username = ?";

  db.query(sql, [usernameOrEmail], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Lỗi hệ thống");
    }

    if (results.length === 0) {
      return res.render("login", {
        error: "Tài khoản không tồn tại",
        formData,
      });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", { error: "Sai mật khẩu!", formData });
      console.log(password, user.password);
    }

    // Lưu session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : "",
      gender: user.gender,
      phoneNumber: user.phoneNumber,
      address: user.address,
      avatarPath: user.avatarPath,
      backgroundPath: user.backgroundPath,
    };
    res.redirect("/");
  });
});

// --------------------------- Xử lý quên mật khẩu
// Xử lý gửi lại mật khẩu
router.post("/forgot", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.render("forgot", { error: "Vui lòng nhập email!", success: null });
  }

  db.query("SELECT * FROM user WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.render("forgot", { error: "Lỗi hệ thống!", success: null });
    }

    if (results.length === 0) {
      return res.render("forgot", { error: "Email không tồn tại!", success: null });
    }

    // Tạo mật khẩu ngẫu nhiên
    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu trong database
    db.query("UPDATE user SET password = ? WHERE email = ?", [hashedPassword, email], async (updateErr) => {
      if (updateErr) {
        console.error(updateErr);
        return res.render("forgot", { error: "Không thể cập nhật mật khẩu!", success: null });
      }

      try {
        await transporter.sendMail({
          from: `"WorkHub Support" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Mật khẩu mới của bạn - WorkHub",
          text: `Xin chào,\n\nMật khẩu mới của bạn là: ${newPassword}\n\nVui lòng đăng nhập và đổi lại mật khẩu sau khi đăng nhập.\n\nTrân trọng,\nĐội ngũ WorkHub.`,
        });

        console.log(`📩 Đã gửi mật khẩu mới tới ${email}`);
        return res.render("forgot", { error: null, success: "Mật khẩu mới đã được gửi tới email của bạn!" });
      } catch (mailErr) {
        console.error("Lỗi gửi email:", mailErr);
        return res.render("forgot", { error: "Không thể gửi email, vui lòng thử lại!", success: null });
      }
    });
  });
});

// ================================ Đăng xuất ================================
router.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Lỗi khi đăng xuất:", err);
        return res.redirect("/"); // quay lại home nếu lỗi
      }
      res.clearCookie("connect.sid");
      res.redirect("/auth/login"); // chuyển về trang đăng nhập
    });
  } else {
    res.redirect("/auth/login");
  }
});

export default router;
