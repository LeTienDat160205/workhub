const userSockets = {}; // userId -> socketId

export function initNotificationSocket(io) {
  io.on("connection", socket => {
    console.log("Notification socket connected:", socket.id);

    socket.on("registerNotif", userId => {
      userSockets[userId] = socket.id;
      console.log("User registered for notifications:", userId, "→", socket.id);
    });

    socket.on("disconnect", () => {
      for (const uid in userSockets) {
        if (userSockets[uid] === socket.id) delete userSockets[uid];
      }
    });
  });
}

export function pushNotificationToUser(io, userId, notif) {
  const socketId = userSockets[userId];
  
  if (socketId) {
    io.to(socketId).emit("newNotification", notif);
    console.log("Sent realtime notif →", userId);
  }
}
