module.exports = function (io) {
  const online = {};
  io.on("connection", (socket) => {
    socket.on("join", ({ username, avatar }) => {
      online[socket.id] = { username, avatar };
      io.emit("onlineList", Object.values(online));
      socket.broadcast.emit("systemMsg", `${username} joined the chat`);
    });
    socket.on("sendMsg", ({ username, avatar, message }) => {
      io.emit("newMsg", {
        username, avatar, message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    });
    socket.on("typing", ({ username }) => { socket.broadcast.emit("typing", username); });
    socket.on("disconnect", () => {
      const u = online[socket.id];
      if (u) socket.broadcast.emit("systemMsg", `${u.username} left the chat`);
      delete online[socket.id];
      io.emit("onlineList", Object.values(online));
    });
  });
};
