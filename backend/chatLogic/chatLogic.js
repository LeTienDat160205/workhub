import db from "../config/db.js";
import { randomUUID } from "crypto";

/**
 * Khởi tạo logic chat realtime
 * @param {Server} io - socket.io instance
 */
export function initChatSocket(io) {
  io.on("connection", (socket) => {
    console.log("Người dùng đã kết nối:", socket.id);

    // Khi user join 1 phòng chat
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      console.log(`User ${socket.id} đã vào phòng ${chatId}`);
    });

    // Khi user gửi tin nhắn
    socket.on("sendMessage", async ({ chatId, senderId, content, messageType = "text" }) => {
      try {
        const { chatId, senderId, content, messageType = "text" } = data;

        if (!senderId || !content) {
          console.warn("⚠️ Thiếu senderId hoặc content trong dữ liệu gửi:", data);
          return socket.emit("errorMessage", { error: "Thiếu thông tin người gửi hoặc nội dung." });
        }

        const messageId = randomUUID({ version: "v7" });

        await db.promise().query(
          `INSERT INTO message (id, chatId, senderId, content, messageType)
           VALUES (UUID_TO_BIN(?), UUID_TO_BIN(?), UUID_TO_BIN(?), ?, ?)`,
          [messageId, chatId, senderId, content, messageType]
        );

        // Lấy lại thông tin người gửi để hiển thị
        const [senderInfo] = await db.promise().query(
          `SELECT username, avatarPath FROM user WHERE id = UUID_TO_BIN(?)`,
          [senderId]
        );

        const message = {
          id: messageId,
          chatId,
          senderId,
          username: senderInfo[0]?.username || "Unknown",
          avatarPath: senderInfo[0]?.avatarPath || "/uploads/default-avatar.png",
          content,
          messageType,
          createdAt: new Date().toISOString()
        };

        // Gửi message đến tất cả user trong phòng
        io.to(chatId).emit("newMessage", message);
      } catch (err) {
        console.error("Lỗi gửi tin nhắn:", err);
        socket.emit("errorMessage", { error: "Gửi tin nhắn thất bại." });
      }
    });

    // Hiển thị trạng thái đang nhập
    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("đang nhập", { chatId });
    });

    // Khi rời phòng
    socket.on("leaveChat", (chatId) => {
      socket.leave(chatId);
      console.log(`Người dùng đã rời khỏi phòng: ${chatId}`);
    });

    socket.on("disconnect", () => {
      console.log("Người dùng mất kết nối:", socket.id);
    });
  });
}
