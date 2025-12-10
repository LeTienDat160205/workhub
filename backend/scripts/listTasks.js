import db from "../config/db.js";

(async () => {
  try {
    const [rows] = await db.promise().query(`SELECT BIN_TO_UUID(id) as id, taskName, createdAt FROM task ORDER BY createdAt DESC LIMIT 10`);
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
