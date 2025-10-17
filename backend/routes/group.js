import express from "express";
import db from "../config/db.js";
import { v7 as uuidv7 } from "uuid";

const router = express.Router();

// middleware to ensure logged in
function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Create group
// POST /groups
router.post("/", ensureAuth, async (req, res) => {
  try {
    const { groupName } = req.body;
    if (!groupName || typeof groupName !== "string" || groupName.trim().length === 0) {
      return res.status(400).json({ error: "groupName is required" });
    }
    const name = groupName.trim();
    const id = uuidv7();
    const createdBy = req.session.user.id; // expecting UUID string in session

    // insert into `group` table (note: table name is `group` in SQL schema)
    const sql = `INSERT INTO \`group\` (id, groupName, memberCount, taskCount, leaderId, createdBy) VALUES (UUID_TO_BIN(?), ?, 1, 0, UUID_TO_BIN(?), UUID_TO_BIN(?))`;

    // For leaderId we set createdBy as leader initially
    await db.promise().query(sql, [id, name, createdBy, createdBy]);

    // Return created group (convert id to string)
    return res.status(201).json({ id, groupName: name, leaderId: createdBy });
  } catch (err) {
    console.error("POST /groups error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
