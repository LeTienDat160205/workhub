// ============================== IMPORTS ==============================
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import db from "../db.js";
import { v7 as uuidv7 } from "uuid";

const router = express.Router();

// ============================== ROUTES ==============================

// Trang đăng nhập
router.get('/login', (req, res) => {
  res.render('login', {error: null});
});

// Trang đăng ký
router.get('/register', (req, res) => {
  res.render('register', {error: null});
});

// Trang quên mật khẩu
router.get('/forgot', (req, res) => res.render('forgot'));

// ============================== ĐĂNG KÝ ==============================
router.post('/register', async (req, res) => {
  const {name, username, email, password, confirmPassword } = req.body;
  const formData = { name, username, email };

  // Kiem tra nhap du thong tin khong
  if (!name || !username || !email || !password || !confirmPassword) {
    return res.render("register", { error: "Vui lòng nhập đủ thông tin!", formData });
  }

  // Username chỉ được chứa chữ cái, số và dấu gạch dưới, độ dài 3-50
  const usernameRegex = /^[a-zA-Z0-9_]{3,50}$/;
  if (!usernameRegex.test(username)) {
    return res.render("register", { error: "Username chỉ được chứa chữ, số, dấu gạch dưới (_) và dài 3-50 ký tự!", formData });
  }

  // Regex kiem tra dinh dang email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.render("register", { error: "Email không hợp lệ, vui lòng nhập đúng định dạng (vd: abc@example.com)!", formData });
  }


  // regex kiem tra mk manh hay khong
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!strongRegex.test(password)) {
    return res.render("register", { error: "Mật khẩu phải >=8 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt!", formData });
  }

  if (password !== confirmPassword) {
    return res.render("register", { error: "Mật khẩu xác nhận không khớp!", formData });
  }

  try {
    // Kiểm tra username/email tồn tại hay ko
    db.query("SELECT * FROM user WHERE username = ? OR email = ?", [username, email], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Lỗi hệ thống");
      }

      // Kiểm tra username hoặc email đã tồn tại hay chưa
      if (results.length > 0) {
        const existsUsername = results.some(r => r.username === username);
        const existsEmail = results.some(r => r.email === email);
        let msg = "Username hoặc Email đã tồn tại, vui lòng chọn cái khác!";
        if (existsUsername && !existsEmail) msg = "Username đã tồn tại!";
        if (!existsUsername && existsEmail) msg = "Email đã tồn tại!";
        return res.render("register", { error: msg, formData });
      }

      // chưa tồn tại thì băm mk ra và nhét vào
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = uuidv7();  // tạo UUID v7
    
      const sql = "INSERT INTO `user` (id, username, email, password, name) VALUES (UUID_TO_BIN(?), ?, ?, ?, ?)";

      db.query(sql, [id, username, email, hashedPassword, name], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Lỗi khi đăng ký");
        }
        res.redirect("/auth/login");
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi hệ thống");
  }
});

// ============================== ĐĂNG NHẬP ==============================
router.post('/login', (req, res) => {
  const { usernameOrEmail, password } = req.body;
  const formData = {usernameOrEmail};

  // Kiem tra nhap du thong tin khong
  if (!usernameOrEmail || !password) {
    return res.render("login", { error: "Vui lòng nhập đủ thông tin!", formData });
  }

  // Kiem tra la username hay email
  const isEmail = usernameOrEmail.includes("@");

  const sql = isEmail 
  ? "SELECT BIN_TO_UUID(id) AS id, username, email, password, name, dob, gender, phoneNumber, address, avatarPath, backgroundPath FROM user WHERE email = ?" 
  : "SELECT BIN_TO_UUID(id) AS id, username, email, password, name, dob, gender, phoneNumber, address, avatarPath, backgroundPath FROM user WHERE username = ?"

  db.query(sql, [usernameOrEmail], async (err, results) => {  
    if (err) {
      console.error(err);
      return res.status(500).send("Lỗi hệ thống");
    }

    if (results.length === 0) {
      return res.render("login", { error: "Tài khoản không tồn tại", formData});
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {error: "Sai mật khẩu!" , formData});
      console.log(password, user.password)
    }

    // Lưu session
   req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    gender: user.gender,
    phoneNumber: user.phoneNumber,
    address: user.address,
    avatarPath: user.avatarPath,
    backgroundPath: user.backgroundPath
  };
    res.redirect("/");
  });
});

// Xử lý quên mật khẩu
router.post('/forgot', (req, res) => {
    // ...xử lý gửi mail...
    res.redirect('/auth/login');
});

export default router;
