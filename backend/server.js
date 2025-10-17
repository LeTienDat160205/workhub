// ============================== IMPORTS ==============================
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import db from "./config/db.js";
import { v7 as uuidv7 } from "uuid";

import path from "path";
import { fileURLToPath } from "url";

// Import các files
import authRoutes from "./routes/auth.js";
import infoRoutes from "./routes/info.js";
import groupRoutes from "./routes/group.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Cấu hình EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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
app.use("/groups", groupRoutes);

// Trang mặc định: nếu chưa login thì hiện form đăng nhập
app.get('/', (req, res) => {
  if (!req.session.user) {
      return res.redirect("/auth/login");
  }
  res.render("home", { 
    user: req.session.user, 
    error: null, 
    success: null, 
    keepProfileOpen: false 
  });
  // res.render("home", { user: req.session.user, error: null, success: null }); 
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));