import express from "express";
import db from "../config/db.js";
import { v7 as uuidv7 } from "uuid";
import { randomUUID } from "crypto";
import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure uploads/tasks directory exists
const TASK_UPLOAD_DIR = path.join(process.cwd(), "uploads", "tasks");
try {
  fs.mkdirSync(TASK_UPLOAD_DIR, { recursive: true });
} catch (err) {
  console.error("Could not create upload directory", TASK_UPLOAD_DIR, err);
}

// Multer storage for task attachments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TASK_UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_.()-]/g, "_");
    const name = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

const router = express.Router();

// middleware to ensure logged in
function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

// =================================== Tạo nhóm =====================================

// Tạo nhóm: thêm vào bảng group và group_user (vai trò leader)
router.post("/", ensureAuth, async (req, res) => {
  try {
    const { groupName } = req.body;
    if (
      !groupName ||
      typeof groupName !== "string" ||
      groupName.trim().length === 0
    ) {
      return res.status(400).json({ error: "groupName is required" });
    }
    const name = groupName.trim();
    const id = uuidv7();
    const createdBy = req.session.user.id;
    // 1. Tạo nhóm
    const sqlGroup = `INSERT INTO \`group\` (id, groupName, memberCount, taskCount, leaderId, createdBy) VALUES (UUID_TO_BIN(?), ?, 1, 0, UUID_TO_BIN(?), UUID_TO_BIN(?))`; //thieu createdAt, updatedAt
    await db.promise().query(sqlGroup, [id, name, createdBy, createdBy]);
    // 2. Thêm vào group_user với vai trò leader
    const sqlGroupUser = `INSERT INTO group_user (id, groupId, userId, roleInGroup) VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), 'leader')`; //thieu joinAt
    await db.promise().query(sqlGroupUser, [uuidv7(), id, createdBy]);
    return res.status(201).json({ id, groupName: name, leaderId: createdBy });
  } catch (err) {
    console.error("POST /groups error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// =============================== Lấy danh sách nhóm đã tham gia ===============================
router.get("/my-groups", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const sql = `
      SELECT 
        BIN_TO_UUID(g.id) AS id,
        g.groupName,
        g.memberCount,
        g.taskCount,
        BIN_TO_UUID(g.leaderId) AS leaderId,
        u_leader.name AS leaderName,
        gu.roleInGroup,
        g.createdAt,
        g.updatedAt
      FROM \`group\` g
      INNER JOIN group_user gu ON gu.groupId = g.id
      LEFT JOIN user u_leader ON g.leaderId = u_leader.id
      WHERE gu.userId = UUID_TO_BIN(?)
      ORDER BY g.createdAt DESC
    `;
    const [rows] = await db.promise().query(sql, [userId]);
    return res.json(rows);
  } catch (err) {
    console.error("GET /groups/my-groups error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
                      TẠO CÔNG VIỆC
============================================================ */
// Use a wrapper to catch multer errors and return JSON instead of an HTML error page
router.post(
  "/createTask",
  ensureAuth,
  (req, res, next) => {
    upload.array("attachments")(req, res, function (err) {
      if (err) {
        console.error("Multer upload error:", err);
        // return JSON so client.parse won't fail on HTML error page
        return res.status(400).json({
          error: "File upload error",
          details: err.message || String(err),
        });
      }
      next();
    });
  },
  async (req, res) => {
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

      // SQL tạo thông báo
      const sqlNotify = `
  INSERT INTO notification (
      id, userId, senderId, message, type, referenceId
  )
  VALUES (
      UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'task', UUID_TO_BIN(?)
  )
`;

      for (const uid of assignees) {
        const assignId = uuidv7();
        await db.promise().query(sqlAssignee, [assignId, taskId, uid]);

        const notifId = uuidv7();
        const message = `Bạn được giao công việc mới: "${taskName}"`;

        await db.promise().query(sqlNotify, [
          notifId, // id thông báo
          uid, // user nhận thông báo
          createdBy, // người giao task
          message, // message hiển thị
          taskId, // referenceId liên kết đến task
        ]);
      }

      // Cập nhật số task của group
      await db.promise().query(
        `UPDATE \`group\`
       SET taskCount = (SELECT COUNT(*) FROM task WHERE groupId = UUID_TO_BIN(?))
       WHERE id = UUID_TO_BIN(?)`,
        [groupId, groupId]
      );

      // Nếu có file đính kèm => lưu metadata vào bảng `file` và trả về danh sách file vừa upload
      const uploadedFiles = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const insertFileSql = `
          INSERT INTO file (id, taskId, userId, fileName, fileType, fileSize, filePath, fileCategory)
          VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, ?, 'attachment')
        `;

        for (const f of req.files) {
          const fileId = uuidv7();
          const fileName = f.originalname;
          const fileType = f.mimetype || null;
          const fileSize = f.size || 0;
          // store relative path for serving later
          const relPath = path
            .join("/uploads/tasks", path.basename(f.path))
            .replace(/\\/g, "/");
          try {
            await db
              .promise()
              .query(insertFileSql, [
                fileId,
                taskId,
                createdBy,
                fileName,
                fileType,
                fileSize,
                relPath,
              ]);
            uploadedFiles.push({ id: fileId, fileName, filePath: relPath, fileType, fileSize });
          } catch (err) {
            console.error("Failed to insert file metadata", err);
          }
        }
      }

      return res.status(201).json({
        success: true,
        message: "Tạo công việc thành công.",
        taskId,
        files: uploadedFiles
      });
    } catch (err) {
      console.error("POST /groups error:", err);
      // If headers already sent, fallback to ending the response
      try {
        if (!res.headersSent)
          return res.status(500).json({ error: "Internal server error" });
      } catch (e) {
        console.error("Error sending 500 response", e);
      }
    }
  }
);

/* ============================================================
           LẤY DANH SÁCH CÔNG VIỆC ĐÃ GIAO (createdBy)
============================================================ */
router.get("/assignedTasks", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const sql = `
SELECT 
    BIN_TO_UUID(t.id) AS id,
    t.taskName,
    t.description,
    t.deadline,
    t.status AS taskStatus,
    t.createdAt,
    t.updatedAt,
    BIN_TO_UUID(t.groupId) AS groupId,
    g.groupName,
    BIN_TO_UUID(t.createdBy) AS creatorId,
    u_creator.name AS creatorName,
    u_creator.avatarPath AS creatorAvatar
FROM task t
LEFT JOIN \`group\` g ON t.groupId = g.id
   LEFT JOIN user u_creator ON t.createdBy = u_creator.id
WHERE t.createdBy = UUID_TO_BIN(?)

ORDER BY t.createdAt DESC;
    `;

    const [rows] = await db.promise().query(sql, [userId]);
    return res.json(rows);
  } catch (err) {
    // console.error("GET /tasks/assigned error:", err);
    console.error("GET /groups/assignedTasks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

    // ==================== LẤY ASSIGNEES CHO 1 TASK (dùng bởi client: /groups/:taskId/assignees)
    router.get('/:taskId/assignees', ensureAuth, async (req, res) => {
      try {
        const { taskId } = req.params;
        const sql = `
          SELECT
            BIN_TO_UUID(ta.userId) AS userId,
            ta.status AS assigneeStatus,
            u.name,
            u.avatarPath
          FROM task_assignee ta
          LEFT JOIN user u ON ta.userId = u.id
          WHERE ta.taskId = UUID_TO_BIN(?)
          ORDER BY ta.id ASC
        `;
        const [rows] = await db.promise().query(sql, [taskId]);
        res.json(rows || []);
      } catch (err) {
        console.error('GET /groups/:taskId/assignees error:', err);
        res.status(500).json({ error: 'Lỗi khi tải assignees' });
      }
    });

/* ============================================================
         LẤY DANH SÁCH CÔNG VIỆC ĐƯỢC GIAO CHO MÌNH
============================================================ */
router.get("/receivedTasks", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const sql = `
SELECT
    BIN_TO_UUID(t.id) AS id,
    t.taskName,
    t.description,
    t.deadline,
    t.status AS taskStatus,
    t.createdAt,
    t.updatedAt,
    BIN_TO_UUID(t.groupId) AS groupId,
    g.groupName,
    BIN_TO_UUID(t.createdBy) AS creatorId,
    u_creator.name AS creatorName,
    u_creator.avatarPath AS creatorAvatar
FROM task_assignee ta
INNER JOIN task t ON ta.taskId = t.id
LEFT JOIN \`group\` g ON t.groupId = g.id
   LEFT JOIN user u_creator ON t.createdBy = u_creator.id

WHERE ta.userId = UUID_TO_BIN(?)

ORDER BY t.createdAt DESC;
    `;

    const [rows] = await db.promise().query(sql, [userId]);
    return res.json(rows);
  } catch (err) {
    // console.error("GET /tasks/received error:", err);
    console.error("GET /groups/receivedTasks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/notifications", ensureAuth, async (req, res) => {
  const userId = req.session.user.id;

  const sql = `
    SELECT 
      BIN_TO_UUID(id) AS id,
      BIN_TO_UUID(userId) AS userId,
      BIN_TO_UUID(senderId) AS senderId,
      message,
      type,
      BIN_TO_UUID(referenceId) AS referenceId,
      isRead,
      createdAt
    FROM notification
    WHERE userId = UUID_TO_BIN(?)
    ORDER BY createdAt DESC
  `;

  const [rows] = await db.promise().query(sql, [userId]);
  res.json(rows);
});

// =============================== Vào trang nhóm (render group.ejs) ===============================
router.get("/:id", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const user = req.session.user;

    const sql = `
      SELECT 
        BIN_TO_UUID(g.id) AS id,
        g.groupName,
        g.memberCount,
        g.taskCount,
        BIN_TO_UUID(g.leaderId) AS leaderId,
        u_leader.name AS leaderName,
        g.createdAt,
        g.updatedAt
      FROM \`group\` g
      LEFT JOIN user u_leader ON g.leaderId = u_leader.id
      WHERE g.id = UUID_TO_BIN(?)
    `;
    const [rows] = await db.promise().query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).send("Không tìm thấy nhóm.");
    }

    const group = rows[0];

    // Thêm code chat
    // Kiểm tra xem nhóm đã có phòng chat chưa
    const [chats] = await db
      .promise()
      .query(
        `SELECT BIN_TO_UUID(id) AS chatId FROM chat WHERE groupId = UUID_TO_BIN(?) LIMIT 1`,
        [id]
      );

    let chatId;
    if (chats.length > 0) {
      chatId = chats[0].chatId;
    } else {
      // Nếu chưa có thì tạo mới phòng chat group
      chatId = randomUUID({ version: "v7" });
      await db.promise().query(
        `INSERT INTO chat (id, chatType, name, groupId, createdBy)
         VALUES (UUID_TO_BIN(?), 'group', ?, UUID_TO_BIN(?), UUID_TO_BIN(?))`,
        [chatId, group.groupName, id, userId]
      );

      // Thêm người tạo vào chat_member
      await db.promise().query(
        `INSERT INTO chat_member (chatId, userId, role)
         VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), 'owner')`,
        [chatId, userId]
      );
    }

    res.render("group", { user, group, chatId });
  } catch (err) {
    console.error("GET /groups/:id error:", err);
    res.status(500).send("Lỗi server.");
  }
});

// =============================== Lấy danh sách thành viên của nhóm ===============================
router.get("/:id/members", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params; // id nhóm
    const sql = `
      SELECT 
        BIN_TO_UUID(u.id) AS userId,
        u.name,
        u.email,
        u.avatarPath,
        gu.roleInGroup,
        gu.joinAt
      FROM group_user gu
      INNER JOIN user u ON gu.userId = u.id
      WHERE gu.groupId = UUID_TO_BIN(?)
      ORDER BY gu.roleInGroup = 'leader' DESC, u.name ASC
    `;
    const [rows] = await db.promise().query(sql, [id]);
    res.json(rows);
  } catch (err) {
    console.error("GET /groups/:id/members error:", err);
    res.status(500).json({ error: "Lỗi khi tải danh sách thành viên." });
  }
});

// =============================== Lấy danh sách người phụ trách của task ===============================
router.get("/:taskId/assignees", ensureAuth, async (req, res) => {
  try {
    const { taskId } = req.params;

    const sql = `
      SELECT 
        BIN_TO_UUID(u.id) AS userId,
        u.name,
        u.avatarPath,
        ta.status AS assigneeStatus
      FROM task_assignee ta
      JOIN user u ON ta.userId = u.id
      WHERE ta.taskId = UUID_TO_BIN(?)
    `;

    const [rows] = await db.promise().query(sql, [taskId]);
    res.json(rows);
  } catch (err) {
    console.error("GET /groups/:taskId/assignees error:", err);
    res.status(500).json({ error: "Lỗi khi tải người phụ trách." });
  }
});

//


// ========================== XÓA NHÓM ==========================
router.delete("/:id/delete", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    // Kiểm tra người dùng có phải leader của nhóm không
    const [checkLeader] = await db
      .promise()
      .query(
        `SELECT 1 FROM \`group\` WHERE id = UUID_TO_BIN(?) AND leaderId = UUID_TO_BIN(?)`,
        [id, userId]
      );

    if (checkLeader.length === 0) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền xóa nhóm này." });
    }

    // Xóa nhóm + liên kết thành viên + chat
    await db
      .promise()
      .query(`DELETE FROM group_user WHERE groupId = UUID_TO_BIN(?)`, [id]);
    await db
      .promise()
      .query(`DELETE FROM \`group\` WHERE id = UUID_TO_BIN(?)`, [id]);
    // await db.promise().query(`DELETE FROM chat WHERE groupId = UUID_TO_BIN(?)`, [id]);

    res.json({ success: true, message: "Đã xóa nhóm thành công." });
  } catch (err) {
    console.error("DELETE /groups/:id/delete error:", err);
    res.status(500).json({ error: "Lỗi khi xóa nhóm." });
  }
});

// =========================== THÊM THÀNH VIÊN VÀO NHÓM ===========================
router.post("/:id/add-member", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const { memberName } = req.body;
    const userId = req.session.user.id;

    if (!memberName || memberName.trim() === "") {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập tên tài khoản hoặc email." });
    }

    // Kiểm tra quyền leader
    const [checkLeader] = await db
      .promise()
      .query(
        `SELECT 1 FROM \`group\` WHERE id = UUID_TO_BIN(?) AND leaderId = UUID_TO_BIN(?)`,
        [id, userId]
      );
    if (checkLeader.length === 0) {
      return res
        .status(403)
        .json({ error: "Chỉ trưởng nhóm mới có quyền thêm thành viên." });
    }

    // Tìm người dùng theo username hoặc email
    const [userRows] = await db
      .promise()
      .query(`SELECT id FROM user WHERE username = ? OR email = ?`, [
        memberName,
        memberName,
      ]);
    if (userRows.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy tài khoản hoặc email này." });
    }
    const newUserId = userRows[0].id;

    // Kiểm tra đã là thành viên chưa
    const [exists] = await db
      .promise()
      .query(
        `SELECT 1 FROM group_user WHERE groupId = UUID_TO_BIN(?) AND userId = ?`,
        [id, newUserId]
      );
    if (exists.length > 0) {
      return res
        .status(409)
        .json({ error: "Người này đã là thành viên của nhóm." });
    }

    // Thêm thành viên
    const newGroupUserId = randomUUID({ version: "v7" }); // cách này ổn hơn với id = uuidv7()

    await db.promise().query(
      `INSERT INTO group_user (id, groupId, userId, roleInGroup, joinAt)
   VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, 'member', NOW())`,
      [newGroupUserId, id, newUserId]
    );

    res.json({ success: true, message: "Đã thêm thành viên thành công." });
  } catch (err) {
    console.error("POST /groups/:id/add-member error:", err);
    res.status(500).json({ error: "Lỗi khi thêm thành viên." });
  }
});

// =========================== XÓA THÀNH VIÊN KHỎI NHÓM ===========================
router.delete("/:id/remove-member", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const { userId: removeUserId } = req.body; // user cần xoá
    const currentUserId = req.session.user.id; // user hiện tại

    if (!removeUserId) {
      return res.status(400).json({ error: "Thiếu ID thành viên cần xoá." });
    }

    // Kiểm tra quyền leader
    const [leaderCheck] = await db
      .promise()
      .query(
        `SELECT 1 FROM \`group\` WHERE id = UUID_TO_BIN(?) AND leaderId = UUID_TO_BIN(?)`,
        [id, currentUserId]
      );
    if (leaderCheck.length === 0) {
      return res
        .status(403)
        .json({ error: "Chỉ trưởng nhóm mới có quyền xoá thành viên." });
    }

    // Kiểm tra người cần xoá có trong nhóm không
    const [memberCheck] = await db
      .promise()
      .query(
        `SELECT 1 FROM group_user WHERE groupId = UUID_TO_BIN(?) AND userId = UUID_TO_BIN(?)`,
        [id, removeUserId]
      );
    if (memberCheck.length === 0) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy thành viên trong nhóm." });
    }

    if (removeUserId === currentUserId) {
      return res
        .status(400)
        .json({ error: "Trưởng nhóm không thể tự xoá chính mình." });
    }

    // Xoá thành viên
    await db
      .promise()
      .query(
        `DELETE FROM group_user WHERE groupId = UUID_TO_BIN(?) AND userId = UUID_TO_BIN(?)`,
        [id, removeUserId]
      );

    // Cập nhật lại memberCount
    await db.promise().query(
      `UPDATE \`group\` 
       SET memberCount = (SELECT COUNT(*) FROM group_user WHERE groupId = UUID_TO_BIN(?)) 
       WHERE id = UUID_TO_BIN(?)`,
      [id, id]
    );

    res.json({ success: true, message: "Đã xoá thành viên khỏi nhóm." });
  } catch (err) {
    console.error("DELETE /groups/:id/remove-member error:", err);
    res.status(500).json({ error: "Lỗi khi xoá thành viên." });
  }
});

// =========================== LẤY THÔNG TIN THÀNH VIÊN ===========================
router.get("/users/:id/info", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().query(
      `SELECT BIN_TO_UUID(id) AS id, username, email, name, dob, gender, phoneNumber, address, avatarPath, backgroundPath
       FROM user
       WHERE id = UUID_TO_BIN(?)`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy người dùng." });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET /users/:id/info error:", err);
    res.status(500).json({ error: "Lỗi khi tải thông tin người dùng." });
  }
});

// =========================== RỜI NHÓM ===========================
router.post("/:id/leave", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params; // groupId
    const sessionUser = req.session.user;

    if (!sessionUser || !sessionUser.id) {
      return res
        .status(401)
        .json({ success: false, error: "Người dùng chưa đăng nhập." });
    }

    const userId = sessionUser.id;

    console.log("🧩 RỜI NHÓM:", { groupId: id, userId });

    // 1️⃣ Kiểm tra nhóm có tồn tại không
    const [groups] = await db
      .promise()
      .query(
        `SELECT BIN_TO_UUID(leaderId) AS leaderId FROM \`group\` WHERE id = UUID_TO_BIN(?)`,
        [id]
      );

    if (groups.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Nhóm không tồn tại." });
    }

    const leaderId = groups[0].leaderId;

    // 2️⃣ Nếu là trưởng nhóm → không thể rời
    if (leaderId && leaderId.toLowerCase() === userId.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error:
          "Trưởng nhóm không thể rời nhóm. Hãy chuyển quyền hoặc xóa nhóm.",
      });
    }

    // 3️⃣ Kiểm tra xem người dùng có trong nhóm không
    const [check] = await db
      .promise()
      .query(
        `SELECT 1 FROM group_user WHERE groupId = UUID_TO_BIN(?) AND userId = UUID_TO_BIN(?)`,
        [id, userId]
      );

    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Bạn không phải là thành viên của nhóm này.",
      });
    }

    // 4️⃣ Xóa khỏi group_user
    await db
      .promise()
      .query(
        `DELETE FROM group_user WHERE groupId = UUID_TO_BIN(?) AND userId = UUID_TO_BIN(?)`,
        [id, userId]
      );

    // 5️⃣ Cập nhật lại memberCount
    await db.promise().query(
      `UPDATE \`group\`
       SET memberCount = (SELECT COUNT(*) FROM group_user WHERE groupId = UUID_TO_BIN(?))
       WHERE id = UUID_TO_BIN(?)`,
      [id, id]
    );

    console.log("✅ Người dùng", userId, "đã rời nhóm", id);

    res.json({ success: true, message: "Bạn đã rời nhóm thành công!" });
  } catch (err) {
    console.error("❌ Lỗi /groups/:id/leave:", err);
    res.status(500).json({ success: false, error: "Lỗi khi rời nhóm." });
  }
});

router.post("/notifications/:id/read", ensureAuth, async (req, res) => {
  const { id } = req.params;

  await db.promise().query(
    `
    UPDATE notification
    SET isRead = TRUE
    WHERE id = UUID_TO_BIN(?)
  `,
    [id]
  );

  res.json({ success: true });
});

export default router;
