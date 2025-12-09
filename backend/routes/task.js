// ========================== IMPORTS ==========================
import express from "express";
import db from "../config/db.js";
import { v7 as uuidv7 } from "uuid";

const router = express.Router();
const getIO = (req) => req.app.get("io");

// ======================= MIDDLEWARE ==========================
function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// =============================================================
//                     TẠO CÔNG VIỆC + THÔNG BÁO
// =============================================================
router.post("/", ensureAuth, async (req, res) => {
  try {
    let { taskName, description, deadline, groupId, assignees } = req.body;

    const createdBy = req.session.user.id;

    // Parse assignees nếu là string
    if (typeof assignees === "string") {
      try {
        assignees = JSON.parse(assignees);
      } catch (err) {
        return res.status(400).json({ error: "Assignees không hợp lệ" });
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
      return res.status(400).json({ error: "Thiếu dữ liệu" });
    }

    // Nếu không có người được giao → không tạo task
    if (assignees.length === 0) {
      return res.status(400).json({ error: "Danh sách assignees rỗng" });
    }

    // 2) GÁN TASK + GỬI THÔNG BÁO
    const sqlAssignee = `
      INSERT INTO task_assignee (id, taskId, userId)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?))
    `;

    await db.promise().query(
      `
      INSERT INTO notification (id, userId, senderId, message, type, referenceId)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'task', UUID_TO_BIN(?))
    `,
      [notiId, userId, senderId, message, type, referenceId]
    );

    const io = getIO(req);

    for (const uid of assignees) {
      const assignId = uuidv7();

      // Lưu task_assignee
      await db.promise().query(sqlAssignee, [assignId, taskId, uid]);

      // Lưu thông báo

      const message = `Bạn được giao công việc: ${taskName}`;

      await db
        .promise()
        .query(sqlNoti, [notiId, uid, createdBy, message, taskId]);
    }

    // 3) Cập nhật số task của group
    await db.promise().query(
      `
      UPDATE \`group\`
      SET taskCount = (SELECT COUNT(*) FROM task WHERE groupId = UUID_TO_BIN(?))
      WHERE id = UUID_TO_BIN(?)
      `,
      [groupId, groupId]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo task + gửi thông báo thành công",
      taskId,
    });
  } catch (err) {
    console.error("POST /tasks error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// =============================================================
//       LẤY DANH SÁCH CÔNG VIỆC ĐÃ GIAO CHO NGƯỜI KHÁC
// =============================================================
router.get("/assigned", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.promise().query(
      `
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
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /tasks/assigned error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
//       LẤY DANH SÁCH CÔNG VIỆC ĐƯỢC GIAO CHO MÌNH
// =============================================================
router.get("/received", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.promise().query(
      `
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
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /tasks/received error:", err);
    res.status(500).json({ error: err.message });
  }
});
//============================CHAT TASK=============================
// LẤY HOẶC TẠO CHAT CHO TASK
router.get("/task/:taskId/chat", ensureAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.session.user.id;

    // 1) Kiểm tra đã có chat chưa
    const [rows] = await db
      .promise()
      .query(
        `SELECT BIN_TO_UUID(id) AS chatId FROM chat WHERE taskId = UUID_TO_BIN(?) LIMIT 1`,
        [taskId]
      );

    if (rows.length > 0) {
      return res.json({ chatId: rows[0].chatId });
    }

    // 2) Nếu chưa → tạo chat mới
    const newChatId = uuidv7();

    await db.promise().query(
      `INSERT INTO chat (id, chatType, name, taskId, createdBy)
       VALUES (UUID_TO_BIN(?), 'task', ?, UUID_TO_BIN(?), UUID_TO_BIN(?))`,
      [newChatId, "Chat task", taskId, userId]
    );

    // 3) Thêm user vào chat
    await db.promise().query(
      `INSERT INTO chat_member (chatId, userId, role)
       VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), 'member')`,
      [newChatId, userId]
    );

    res.json({ chatId: newChatId });
  } catch (err) {
    console.error("Task chat error:", err);
    res.status(500).json({ error: "Lỗi task chat" });
  }
});

export default router;
