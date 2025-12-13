// backend/routes/chatbot.js
import express from "express";
import { getGeminiReply } from "../config/chatbot.js";
import ensureAuth from "../middlewares/ensureAuth.js";
import db from "../config/db.js";

const router = express.Router();

// API chính cho chatbot
// router.post("/chat", async (req, res) => {
//   const { message } = req.body;

//   if (!message || message.trim() === "") {
//     return res.status(400).json({ reply: "Vui lòng nhập nội dung cần hỏi." });
//   }

//   try {
//     const reply = await getGeminiReply(message);
//     res.json({ reply });
//   } catch (err) {
//     console.error("Chatbot error:", err);
//     res.status(500).json({ reply: "Lỗi kết nối chatbot 😢" });
//   }
// });

router.post("/", ensureAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const userMessage = req.body.message;

    // Task chưa hoàn thành
    const [[unfinished]] = await db.promise().query(`
      SELECT COUNT(*) AS total
      FROM task t
      JOIN task_assignee ta ON t.id = ta.taskId
      WHERE ta.userId = UUID_TO_BIN(?)
        AND t.status != 'done'
    `, [userId]);

    // Task sắp đến hạn (3 ngày)
    const [upcoming] = await db.promise().query(`
      SELECT taskName, deadline
      FROM task t
      JOIN task_assignee ta ON t.id = ta.taskId
      WHERE ta.userId = UUID_TO_BIN(?)
        AND t.status != 'done'
        AND t.deadline IS NOT NULL
        AND t.deadline <= DATE_ADD(NOW(), INTERVAL 3 DAY)
      ORDER BY deadline ASC
    `, [userId]);

    // TẠO CONTEXT
    const taskContext = `
Dữ liệu công việc của người dùng:
- Số công việc chưa hoàn thành: ${unfinished.total}
- Công việc sắp đến hạn:
${
  upcoming.length
    ? upcoming.map(
        t => `• ${t.taskName} (hạn: ${new Date(t.deadline).toLocaleDateString("vi-VN")})`
      ).join("\n")
    : "Không có công việc sắp đến hạn"
}
`;

    // GHÉP VÀO PROMPT
    const finalPrompt = `
${taskContext}

Câu hỏi của người dùng:
"${userMessage}"
`;

    const reply = await getGeminiReply(finalPrompt);

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: "Chatbot đang bận, thử lại sau." });
  }
});

export default router;
