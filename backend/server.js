// ============================== IMPORTS ==============================
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import session from "express-session";
import db from "./config/db.js";
import { v7 as uuidv7 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

// Import các routes
import authRoutes from "./routes/auth.js";
import infoRoutes from "./routes/info.js";
import groupRoutes from "./routes/group.js";
import chatRoutes from "./routes/chat.js";

// chat real time
import { initChatSocket } from "./chatLogic/chatLogic.js";
import { createSocket } from "./config/socket.js";

// Setup
const app = express();
const server = http.createServer(app); 
const io = createSocket(server);       // Tạo socket server

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Cấu hình session
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));

// Cấu hình EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use("/frontend", express.static(path.join(__dirname, "..", "frontend")));

// Sử dụng routes
app.use("/auth", authRoutes);
app.use("/info", infoRoutes);
app.use("/groups", groupRoutes);
app.use("/chats", chatRoutes);

// Khởi tạo logic chat realtime
initChatSocket(io);

// Trang mặc định: nếu chưa login thì hiện form đăng nhập
app.get('/', (req, res) => {
  if (!req.session.user) {
      return res.redirect("/auth/login");
  }
  res.render("home", { 
    user: req.session.user, 
    error: null, 
    success: null, 
  });
});

// app.listen(3000, () => console.log('Server running at http://localhost:3000'));
const PORT = 3000;
server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));