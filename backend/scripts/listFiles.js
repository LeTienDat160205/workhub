import db from "../config/db.js";

const taskId = process.argv[2];
if (!taskId) {
  console.error('Usage: node listFiles.js <taskId>');
  process.exit(1);
}

(async () => {
  try {
    const [rows] = await db.promise().query(
      `SELECT BIN_TO_UUID(id) AS id, fileName, filePath, fileCategory, createdAt, BIN_TO_UUID(userId) as userId FROM file WHERE taskId = UUID_TO_BIN(?) ORDER BY createdAt DESC`,
      [taskId]
    );
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
