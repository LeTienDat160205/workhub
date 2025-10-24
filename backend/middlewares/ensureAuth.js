// ======================= ensureAuth Middleware =======================
// Middleware để kiểm tra người dùng đã đăng nhập hay chưa
export default function ensureAuth(req, res, next) {
  try {
    // Nếu chưa đăng nhập thì chuyển về trang login
    if (!req.session || !req.session.user) {
      return res.redirect("/auth/login");
    }

    // Nếu đã đăng nhập thì cho phép tiếp tục
    next();
  } catch (err) {
    console.error("Lỗi trong ensureAuth:", err);
    res.status(500).send("Lỗi xác thực người dùng.");
  }
}
