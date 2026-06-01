const Message = require("../models/Message");

module.exports = function (io) {
  const dmNS       = io.of("/dm");
  const userSockets = {};

  dmNS.on("connection", (socket) => {
    socket.on("register", ({ userId }) => {
      userSockets[String(userId)] = socket.id;
      socket.userId = String(userId);
    });

    socket.on("sendDM", async ({ toUserId, body, fromUserId }) => {
      if (!body || !body.trim()) return;
      try {
        const msg = await Message.create({ from: fromUserId, to: toUserId, body: body.trim() });
        await msg.populate("from", "username avatar");

        const payload = {
          _id:       String(msg._id),
          body:      msg.body,
          createdAt: msg.createdAt,
          from: { _id: String(msg.from._id), username: msg.from.username, avatar: msg.from.avatar },
        };

        const recipientSocketId = userSockets[String(toUserId)];
        if (recipientSocketId) {
          dmNS.to(recipientSocketId).emit("newDM", Object.assign({}, payload, { fromMe: false }));
        }
        socket.emit("newDM", Object.assign({}, payload, { fromMe: true }));
      } catch (e) {
        socket.emit("dmError", "Failed to send message.");
      }
    });

    socket.on("typing", ({ toUserId, username }) => {
      const s = userSockets[String(toUserId)];
      if (s) dmNS.to(s).emit("typing", { username });
    });
    socket.on("stopTyping", ({ toUserId }) => {
      const s = userSockets[String(toUserId)];
      if (s) dmNS.to(s).emit("stopTyping");
    });
    socket.on("disconnect", () => {
      if (socket.userId) delete userSockets[socket.userId];
    });
  });
};
