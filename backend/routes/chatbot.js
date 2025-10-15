// backend/routes/chatbot.js
import express from "express";
import { getGeminiReply } from "../config/chatbot.js";

const router = express.Router();

// API chính cho chatbot
router.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ reply: "Vui lòng nhập nội dung cần hỏi." });
  }

  try {
    const reply = await getGeminiReply(message);
    res.json({ reply });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ reply: "Lỗi kết nối chatbot 😢" });
  }
});

export default router;
