import express from "express";
import db from "../config/db.js";
import { v7 as uuidv7 } from "uuid";
import { randomUUID } from "crypto";

const router = express.Router();

// middleware to ensure logged in
function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// =================================== Tạo nhóm =====================================

// Tạo nhóm: thêm vào bảng group và group_user (vai trò leader)
router.post("/", ensureAuth, async (req, res) => {
  try {
    const { groupName } = req.body;
    if (!groupName || typeof groupName !== "string" || groupName.trim().length === 0) {
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
    const [chats] = await db.promise().query(
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

// ========================== XÓA NHÓM ==========================
router.delete("/:id/delete", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    // Kiểm tra người dùng có phải leader của nhóm không
    const [checkLeader] = await db.promise().query(
      `SELECT 1 FROM \`group\` WHERE id = UUID_TO_BIN(?) AND leaderId = UUID_TO_BIN(?)`,
      [id, userId]
    );

    if (checkLeader.length === 0) {
      return res.status(403).json({ error: "Bạn không có quyền xóa nhóm này." });
    }

    // Xóa nhóm + liên kết thành viên
    await db.promise().query(`DELETE FROM group_user WHERE groupId = UUID_TO_BIN(?)`, [id]);
    await db.promise().query(`DELETE FROM \`group\` WHERE id = UUID_TO_BIN(?)`, [id]);

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
      return res.status(400).json({ error: "Vui lòng nhập tên tài khoản hoặc email." });
    }

    // Kiểm tra quyền leader
    const [checkLeader] = await db.promise().query(
      `SELECT 1 FROM \`group\` WHERE id = UUID_TO_BIN(?) AND leaderId = UUID_TO_BIN(?)`,
      [id, userId]
    );
    if (checkLeader.length === 0) {
      return res.status(403).json({ error: "Chỉ trưởng nhóm mới có quyền thêm thành viên." });
    }

    // Tìm người dùng theo username hoặc email
    const [userRows] = await db.promise().query(
      `SELECT id FROM user WHERE username = ? OR email = ?`,
      [memberName, memberName]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy tài khoản hoặc email này." });
    }
    const newUserId = userRows[0].id;

    // Kiểm tra đã là thành viên chưa
    const [exists] = await db.promise().query(
      `SELECT 1 FROM group_user WHERE groupId = UUID_TO_BIN(?) AND userId = ?`,
      [id, newUserId]
    );
    if (exists.length > 0) {
      return res.status(409).json({ error: "Người này đã là thành viên của nhóm." });
    }

    // Thêm thành viên
    const newGroupUserId = randomUUID({ version: 'v7' });// cách này ổn hơn với id = uuidv7()

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
    const [leaderCheck] = await db.promise().query(
      `SELECT 1 FROM \`group\` WHERE id = UUID_TO_BIN(?) AND leaderId = UUID_TO_BIN(?)`,
      [id, currentUserId]
    );
    if (leaderCheck.length === 0) {
      return res.status(403).json({ error: "Chỉ trưởng nhóm mới có quyền xoá thành viên." });
    }

    // Kiểm tra người cần xoá có trong nhóm không
    const [memberCheck] = await db.promise().query(
      `SELECT 1 FROM group_user WHERE groupId = UUID_TO_BIN(?) AND userId = UUID_TO_BIN(?)`,
    [id, removeUserId]
    );
    if (memberCheck.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy thành viên trong nhóm." });
    }

    if (removeUserId === currentUserId) {
      return res.status(400).json({ error: "Trưởng nhóm không thể tự xoá chính mình." });
    }

    // Xoá thành viên
    await db.promise().query(
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


export default router;
