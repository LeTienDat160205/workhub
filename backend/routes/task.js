import express from "express";
import db from "../config/db.js";
import { v7 as uuidv7 } from "uuid";

const router = express.Router();

// middleware
function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* ============================================================
                      TẠO CÔNG VIỆC
============================================================ */
router.post("/", ensureAuth, async (req, res) => {
  try {
    let { taskName, description, deadline, groupId, assignees } = req.body;

    // Người tạo task
    const createdBy = req.session.user.id;

    // Nếu FE gửi dạng string -> parse JSON
    if (typeof assignees === "string") {
      try {
        assignees = JSON.parse(assignees);
      } catch (err) {
        return res.status(400).json({ error: "Assignees không hợp lệ." });
      }
    }

    console.log("------ DEBUG TASK CREATE ------");
    console.log("taskName:", taskName);
    console.log("description:", description);
    console.log("deadline:", deadline);
    console.log("groupId:", groupId);
    console.log("assignees raw:", req.body.assignees);
    console.log("assignees after parse:", assignees);
    console.log("typeof assignees:", typeof assignees);
    console.log("isArray?", Array.isArray(assignees));
    console.log("--------------------------------");

    if (!taskName || !groupId || !Array.isArray(assignees)) {
      return res.status(400).json({ error: "Thiếu dữ liệu cần thiết." });
    }

    const taskId = uuidv7();

    // Tạo task
    const sqlTask = `
      INSERT INTO task (id, taskName, description, deadline, createdBy, groupId)
      VALUES (UUID_TO_BIN(?), ?, ?, ?, UUID_TO_BIN(?), UUID_TO_BIN(?))
    `;
    await db
      .promise()
      .query(sqlTask, [
        taskId,
        taskName,
        description || null,
        deadline || null,
        createdBy,
        groupId,
      ]);

    // Giao cho nhiều người
    const sqlAssignee = `
      INSERT INTO task_assignee (id, taskId, userId)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?))
    `;

    for (const uid of assignees) {
      const assignId = uuidv7();
      await db.promise().query(sqlAssignee, [assignId, taskId, uid]);
    }

    // Cập nhật số task của group
    await db.promise().query(
      `UPDATE \`group\`
       SET taskCount = (SELECT COUNT(*) FROM task WHERE groupId = UUID_TO_BIN(?))
       WHERE id = UUID_TO_BIN(?)`,
      [groupId, groupId]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo công việc thành công.",
      taskId,
    });
  } catch (err) {
    // console.error("POST /tasks error:", err);
    console.error("POST /groups error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
           LẤY DANH SÁCH CÔNG VIỆC ĐÃ GIAO (createdBy)
============================================================ */
router.get("/assigned", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const sql = `
      SELECT 
        BIN_TO_UUID(t.id) AS id,
        t.taskName,
        t.description,
        t.deadline,
        t.status,
        t.createdAt,
        t.updatedAt,
        BIN_TO_UUID(t.groupId) AS groupId,
        g.groupName
      FROM task t
      LEFT JOIN \`group\` g ON t.groupId = g.id
      WHERE t.createdBy = UUID_TO_BIN(?)
      ORDER BY t.createdAt DESC
    `;

    const [rows] = await db.promise().query(sql, [userId]);
    return res.json(rows);

  } catch (err) {
    // console.error("GET /tasks/assigned error:", err);
    console.error("GET /groups/assignedTasks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
         LẤY DANH SÁCH CÔNG VIỆC ĐƯỢC GIAO CHO MÌNH
============================================================ */
router.get("/received", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const sql = `
      SELECT
        BIN_TO_UUID(t.id) AS id,
        t.taskName,
        t.description,
        t.deadline,
        t.status,
        t.createdAt,
        t.updatedAt,
        BIN_TO_UUID(t.groupId) AS groupId,
        g.groupName,
        ta.status AS assigneeStatus
      FROM task_assignee ta
      INNER JOIN task t ON ta.taskId = t.id
      LEFT JOIN \`group\` g ON t.groupId = g.id
      WHERE ta.userId = UUID_TO_BIN(?)
      ORDER BY t.createdAt DESC
    `;

    const [rows] = await db.promise().query(sql, [userId]);
    return res.json(rows);

  } catch (err) {
    // console.error("GET /tasks/received error:", err);
    console.error("GET /groups/receivedTasks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
