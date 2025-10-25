// backend/routes/chat.js
import express from "express";
import db from "../config/db.js";
import ensureAuth from "../middlewares/ensureAuth.js";

const router = express.Router();

router.get("/:chatId/messages", ensureAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const [messages] = await db.promise().query(
      `SELECT 
         BIN_TO_UUID(m.id) AS id,
         BIN_TO_UUID(m.chatId) AS chatId,
         BIN_TO_UUID(m.senderId) AS senderId,
         m.content,
         m.messageType,
         m.fileUrl,
         m.replyTo,
         m.createdAt,
         u.name AS username,
         u.avatarPath
       FROM message m
       JOIN user u ON m.senderId = u.id
       WHERE m.chatId = UUID_TO_BIN(?)
       ORDER BY m.createdAt ASC`,
      [chatId]
    );
    res.json(messages);
  } catch (err) {
    console.error("Lỗi tải tin nhắn:", err);
    res.status(500).json({ error: "Không thể tải tin nhắn." });
  }
});

export default router;
