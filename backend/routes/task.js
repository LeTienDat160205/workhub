// ========================== IMPORTS ==========================
import express from "express";
import db from "../config/db.js";
import upload from "../middlewares/upload.js";
import fileUpload from "../middlewares/fileUpload.js";
import { v7 as uuidv7 } from "uuid";
import path from "path";
import fs from "fs";

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

    await db.promise().query(`
      INSERT INTO notification (id, userId, senderId, message, type, referenceId)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'task', UUID_TO_BIN(?))
    `,
      [notiId, userId, senderId, message, type, referenceId]
      [notiId, userId, senderId, message, type, referenceId]
    );


    const io = getIO(req);

    for (const uid of assignees) {
      const assignId = uuidv7();

      // Lưu task_assignee
      await db.promise().query(sqlAssignee, [assignId, taskId, uid]);

      // Lưu thông báo


      const message = `Bạn được giao công việc: ${taskName}`;

      await db.promise().query(sqlNoti, [
        notiId,
        uid,
        createdBy,
        message,
        taskId,
      ]);


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

// =============================== Lấy file đính kèm TASK ===============================
router.get("/:taskId/files", ensureAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('/tasks/:taskId/files called, cookies=', req.headers.cookie);

    const sql = `
      SELECT 
        BIN_TO_UUID(id) AS fileId,
        BIN_TO_UUID(userId) AS userId,
        fileName,
        fileType,
        fileSize,
        filePath,
        fileCategory,
        createdAt
      FROM file
      WHERE taskId = UUID_TO_BIN(?) 
        AND fileCategory = 'attachment'
      ORDER BY createdAt ASC
    `;

    const [rows] = await db.promise().query(sql, [taskId]);
    res.json(rows || []);
  } catch (err) {
    console.error("GET /tasks/:taskId/files error:", err);
    res.status(500).json({ error: "Lỗi khi tải file đính kèm." });
  }
});


// =============================== Lấy file sản phẩm ===============================
router.get("/:taskId/submissions", ensureAuth, async (req, res) => {
  try {
    const { taskId } = req.params;

    const sql = `
      SELECT 
        BIN_TO_UUID(id) AS fileId,
        BIN_TO_UUID(userId) AS userId,
        fileName,
        fileType,
        fileSize,
        filePath,
        createdAt
      FROM file
      WHERE taskId = UUID_TO_BIN(?)
        AND fileCategory = 'submission'
      ORDER BY createdAt DESC
    `;

    const [rows] = await db.promise().query(sql, [taskId]);
    res.json(rows || []);
  } catch (err) {
    console.error("GET /tasks/:taskId/submissions error:", err);
    res.status(500).json({ error: "Lỗi khi tải file sản phẩm." });
  }
});


// =============================== Nộp file sản phẩm ===============================
router.post("/:taskId/submit", ensureAuth, (req, res, next) => {
  // prefer disk-based upload for task submissions (fallback to cloudinary middleware if used elsewhere)
  fileUpload.single("file")(req, res, function (err) {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ error: "File upload error", details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const userId = req.session.user.id;
    const fileId = uuidv7();

    // Expose as web-accessible path under /uploads/tasks/<filename>
    const filePath = `/uploads/tasks/${path.basename(req.file.path)}`;

    const sql = `
      INSERT INTO file (id, taskId, userId, fileName, fileType, fileSize, filePath, fileCategory)
      VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, 'submission')
    `;

    await db.promise().query(sql, [
      fileId,
      taskId,
      userId,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      filePath
    ]);

    res.json({ success: true, file: { id: fileId, name: req.file.originalname, url: filePath } });

  } catch (err) {
    console.error("POST /tasks/:taskId/submit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// =============================== Update trạng thái người được giao ===============================
router.put("/:taskId/assignees/:userId/status", ensureAuth, async (req, res) => {
  try {
    const { taskId, userId } = req.params;
    const { status } = req.body;
    console.log(`PUT /tasks/${taskId}/assignees/${userId}/status payload:`, req.body, "sessionUser=", req.session && req.session.user && req.session.user.id);

    if (!["assigned", "in_progress", "done"].includes(status))
      return res.status(400).json({ error: "Trạng thái không hợp lệ." });

    const dbStatus = status;

    const sql = `
      UPDATE task_assignee
      SET status = ?
      WHERE taskId = UUID_TO_BIN(?) AND userId = UUID_TO_BIN(?)
    `;

    const [result] = await db.promise().query(sql, [dbStatus, taskId, userId]);

    console.log(`Updated task_assignee status for task ${taskId} user ${userId} -> ${dbStatus}`);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Không tìm thấy dữ liệu." });

    res.json({ success: true });

  } catch (err) {
    console.error("PUT /tasks/:taskId/assignees/:userId/status error:", err);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái." });
  }
});

// =============================== Cập nhật trạng thái chung dựa trên người được giao ===============================
router.put("/:taskId/status", ensureAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log(`PUT /tasks/${taskId}/status called, sessionUser=`, req.session && req.session.user && req.session.user.id);

    // Get all assignee statuses
    const [assignees] = await db.promise().query(
      `SELECT status FROM task_assignee WHERE taskId = UUID_TO_BIN(?)`,
      [taskId]
    );

    if (!assignees || assignees.length === 0) {
      // No assignees, set to pending
      await db.promise().query(
        `UPDATE task SET status = 'pending' WHERE id = UUID_TO_BIN(?)`,
        [taskId]
      );
      return res.json({ success: true, globalStatus: 'pending' });
    }

    // Check statuses
    const statuses = assignees.map(a => a.status);
    let globalStatus = 'pending';

    // If any assignee is in_progress, global is in_progress
    if (statuses.some(s => s === 'in_progress')) {
      globalStatus = 'in_progress';
    }

    // If all assignees are done, global is done (use 'done' to match client)
    if (statuses.every(s => s === 'done')) {
      globalStatus = 'done';
    }

    // Update global task status
    await db.promise().query(
      `UPDATE task SET status = ? WHERE id = UUID_TO_BIN(?)`,
      [globalStatus, taskId]
    );

    res.json({ success: true, globalStatus });
  } catch (err) {
    console.error("PUT /tasks/:taskId/status error:", err);
    res.status(500).json({ error: "Lỗi khi cập nhật trạng thái chung." });
  }
});

// =============================== XÓA TASK (chỉ người tạo được xóa) ===============================
router.delete('/:taskId', ensureAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.session.user.id;

    // Kiểm tra task tồn tại và ai là người tạo
    const [[taskRow]] = await db.promise().query(
      `SELECT BIN_TO_UUID(createdBy) AS createdBy FROM task WHERE id = UUID_TO_BIN(?)`,
      [taskId]
    );

    if (!taskRow) return res.status(404).json({ error: 'Task không tồn tại.' });
    if (String(taskRow.createdBy) !== String(userId)) return res.status(403).json({ error: 'Bạn không có quyền xóa task này.' });

    // Lấy danh sách file liên quan để xóa file vật lý (nếu có)
    const [files] = await db.promise().query(
      `SELECT filePath FROM file WHERE taskId = UUID_TO_BIN(?)`,
      [taskId]
    );

    for (const f of files || []) {
      try {
        if (f.filePath && f.filePath.startsWith('/uploads')) {
          const abs = path.join(process.cwd(), f.filePath);
          if (fs.existsSync(abs)) {
            fs.unlinkSync(abs);
          }
        }
      } catch (e) {
        console.error('Failed to delete file on disk', f.filePath, e);
      }
    }

    // Xóa các bản ghi liên quan
    await db.promise().query(`DELETE FROM file WHERE taskId = UUID_TO_BIN(?)`, [taskId]);
    await db.promise().query(`DELETE FROM task_assignee WHERE taskId = UUID_TO_BIN(?)`, [taskId]);
    await db.promise().query(`DELETE FROM notification WHERE referenceId = UUID_TO_BIN(?)`, [taskId]);
    await db.promise().query(`DELETE FROM task WHERE id = UUID_TO_BIN(?)`, [taskId]);

    res.json({ success: true, message: 'Đã xóa công việc.' });
  } catch (err) {
    console.error('DELETE /tasks/:taskId error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa task.' });
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
