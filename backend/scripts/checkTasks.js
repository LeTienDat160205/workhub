import db from "../config/db.js";

(async () => {
  try {
    const [tasks] = await db.promise().query(`
      SELECT BIN_TO_UUID(t.id) as taskId, t.taskName, COUNT(f.id) as fileCount
      FROM task t
      LEFT JOIN file f ON f.taskId = t.id AND f.fileCategory = 'attachment'
      GROUP BY t.id
      ORDER BY t.createdAt DESC
      LIMIT 5
    `);

    console.log("Recent tasks with attachment count:");
    console.log(tasks);

    if (tasks.length > 0) {
      const taskId = tasks[0].taskId;
      console.log(`\nFiles for task ${taskId}:`);
      const [files] = await db.promise().query(`
        SELECT BIN_TO_UUID(id) as id, fileName, filePath, fileCategory, createdAt
        FROM file
        WHERE taskId = UUID_TO_BIN(?)
        ORDER BY createdAt DESC
      `, [taskId]);
      console.log(files);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
