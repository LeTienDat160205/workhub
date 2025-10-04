const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("./db");
const { v7: uuidv7 } = require("uuid");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Cấu hình EJS
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// Cấu hình session
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
  })
);

//----------------------------------------------------------------------------

// Trang mặc định: nếu chưa login thì hiện form đăng nhập
app.get('/', (req, res) => {
    if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("info", { user: req.session.user }); 
});


// Trang đăng nhập
app.get('/login', (req, res) => res.render('login'));

// Trang đăng ký
app.get('/register', (req, res) => {
  res.render('register', {error: null});
});

// Trang quên mật khẩu
app.get('/forgot', (req, res) => res.render('forgot'));

// Xử lý đăng ký
app.post('/register', async (req, res) => {
  const {name, username, email, password, confirmPassword } = req.body;
  const formData = { name, username, email };

  // Kiem tra nhap du thong tin khong
  if (!username || !email || !password || !confirmPassword) {
    return res.render("register", { error: "Vui lòng nhập đủ thông tin!", formData });
  }

  // regex kiem tra mk manh hay khong
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!strongRegex.test(password)) {
    return res.render("register", { error: "Mật khẩu phải >=8 ký tự, có ít nhất 1 hoa, 1 thường, 1 số và 1 ký tự đặc biệt!", formData });
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
    
      const sql = "INSERT INTO `user` (id, username, email, password) VALUES (UUID_TO_BIN(?), ?, ?, ?)";

      db.query(sql, [id, username, email, hashedPassword], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Lỗi khi đăng ký");
        }
        res.redirect("/login");
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Lỗi hệ thống");
  }
});

// Xử lý đăng nhập
app.post('/login', (req, res) => {
  const { username, email, password } = req.body;

  db.query("SELECT * FROM user WHERE username = ? OR email = ?", [username, email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Lỗi hệ thống");
    }

    if (results.length === 0) {
      return res.send("Sai email hoặc mật khẩu!");
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.send("Sai email hoặc mật khẩu!");
    }

    // Lưu session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    res.redirect("/");
  });
});

// Xử lý quên mật khẩu
app.post('/forgot', (req, res) => {
    // ...xử lý gửi mail...
    res.redirect('/login');
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));