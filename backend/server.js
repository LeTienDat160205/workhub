const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const db = require("./db");
const { v7: uuidv7 } = require("uuid");

// Import các file
const authRoutes = require("./features/auth");
const infoRoutes = require("./features/info");

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
// Sử dụng routes
app.use("/auth", authRoutes);
app.use("/info", infoRoutes);

// Trang mặc định: nếu chưa login thì hiện form đăng nhập
app.get('/', (req, res) => {
    if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  res.render("info", { user: req.session.user, error: null, success: null }); 
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));