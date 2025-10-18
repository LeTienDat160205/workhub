import express from "express";
import db from "../config/db.js";
import { v7 as uuidv7 } from "uuid";

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

// Lấy danh sách nhóm đã tham gia
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

export default router;
