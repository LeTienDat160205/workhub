import express from "express";
import db from "../config/db.js";

const router = express.Router();

function ensureAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/", ensureAuth, async (req, res) => {
  const userId = req.session.user.id;

  const [rows] = await db.promise().query(`
    SELECT BIN_TO_UUID(id) AS id, message, createdAt
    FROM notification
    WHERE userId = UUID_TO_BIN(?)
    ORDER BY createdAt DESC
  `, [userId]);

  res.json(rows);
});

export default router;
