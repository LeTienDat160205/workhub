import db from "../config/db.js";

const taskId = process.argv[2];
if (!taskId) {
  console.error('Usage: node showAssignees.js <taskId>');
  process.exit(1);
}

(async () => {
  try {
    const [rows] = await db.promise().query(
      `SELECT BIN_TO_UUID(userId) as userId, status FROM task_assignee WHERE taskId = UUID_TO_BIN(?)`,
      [taskId]
    );
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
