const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",       
  password: "abc123",      
  database: "team_task_management"
});

db.connect(err => {
  if (err) throw err;
  console.log("✅ Đã kết nối MySQL");
});

module.exports = db;