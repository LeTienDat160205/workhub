// backend/config/socket.js
import { Server } from "socket.io";

export function createSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // hoặc domain frontend
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}
