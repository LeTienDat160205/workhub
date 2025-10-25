// backend/chatLogic/chatLogic.js
import db from "../config/db.js";
import { randomUUID } from "crypto";

/**
 * Khởi tạo logic chat realtime (socket.io)
 * @param {Server} io
 */
export function initChatSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // Khi user join 1 phòng chat
    socket.on("joinChat", (chatId) => {
      if (!chatId) return;
      socket.join(chatId);
      console.log(`→ ${socket.id} joined room ${chatId}`);
    });

    // Khi user gửi tin nhắn
    socket.on("sendMessage", async (payload) => {
      try {
        // debug: in ra payload để kiểm tra client gửi đúng không
        console.log("recv sendMessage payload:", payload);

        // payload phải là object: { chatId, senderId, content, messageType?, fileUrl?, replyTo? }
        if (!payload || typeof payload !== "object") {
          return socket.emit("errorMessage", { error: "Dữ liệu gửi không hợp lệ." });
        }

        // Lấy các trường (không dùng 'data' biến lạ)
        const { chatId, senderId, content, messageType = "text", fileUrl = null, replyTo = null } = payload;

        if (!chatId || !senderId || !content) {
          console.warn("⚠️ Thiếu senderId/chatId/content:", payload);
          return socket.emit("errorMessage", { error: "Thiếu thông tin người gửi hoặc nội dung." });
        }

        const messageId = randomUUID({ version: "v7" });

        // Lưu tin nhắn vào bảng `message`
        await db.promise().query(
          `INSERT INTO message (id, chatId, senderId, content, messageType, fileUrl, replyTo)
           VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?, ?, UUID_TO_BIN(?))`,
          [messageId, chatId, senderId, content, messageType, fileUrl, replyTo]
        );

        // Cập nhật lastMessage/lastMessageTime (nếu muốn)
        await db.promise().query(
          `UPDATE chat SET lastMessage = ?, lastMessageTime = NOW() WHERE id = UUID_TO_BIN(?)`,
          [content, chatId]
        );

        // Lấy thông tin người gửi để trả về client
        const [senderRows] = await db.promise().query(
          `SELECT name, username, avatarPath FROM user WHERE id = UUID_TO_BIN(?)`,
          [senderId]
        );

        const sender = senderRows[0] || {};
        const message = {
          id: messageId,
          chatId,
          senderId,
          username: sender.name || sender.username || "Unknown",
          avatarPath: sender.avatarPath || "/uploads/default-avatar.png",
          content,
          messageType,
          fileUrl,
          replyTo,
          createdAt: new Date().toISOString()
        };

        // Gửi tin nhắn realtime tới tất cả thành viên phòng
        io.to(chatId).emit("newMessage", message);
      } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
        socket.emit("errorMessage", { error: "Gửi tin nhắn thất bại." });
      }
    });

    // Thả cảm xúc
    socket.on("reactMessage", async ({ messageId, userId, emoji }) => {
      try {
        await db.promise().query(
          `REPLACE INTO message_reaction (messageId, userId, emoji, reactedAt)
           VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), ?, NOW())`,
          [messageId, userId, emoji]
        );
        io.emit("messageReacted", { messageId, userId, emoji });
      } catch (err) {
        console.error("Lỗi reactMessage:", err);
      }
    });

    // Đánh dấu đã đọc
    socket.on("markAsRead", async ({ messageId, userId }) => {
      try {
        await db.promise().query(
          `INSERT IGNORE INTO message_read (messageId, userId, readAt)
           VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), NOW())`,
          [messageId, userId]
        );
      } catch (err) {
        console.error("Lỗi markAsRead:", err);
      }
    });

    socket.on("leaveChat", (chatId) => {
      if (chatId) socket.leave(chatId);
      console.log(`${socket.id} left room ${chatId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });
}
