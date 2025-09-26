const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', (req, res) => {
    res.redirect('/login'); // hoặc res.render('login') nếu muốn hiển thị luôn trang đăng nhập
});


// Trang đăng nhập
app.get('/login', (req, res) => res.render('login'));

// Trang đăng ký
app.get('/register', (req, res) => res.render('register'));

// Trang quên mật khẩu
app.get('/forgot', (req, res) => res.render('forgot'));

// Xử lý đăng ký
app.post('/register', (req, res) => {
    // ...xử lý đăng ký...
    res.redirect('/login');
});

// Xử lý đăng nhập
app.post('/login', (req, res) => {
    // ...xử lý đăng nhập...
    res.redirect('/dashboard');
});

// Xử lý quên mật khẩu
app.post('/forgot', (req, res) => {
    // ...xử lý gửi mail...
    res.redirect('/login');
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));