// WebRTC Video Call Signalling Server
// Uses Socket.IO namespace /video as the signalling channel.
// The actual audio/video streams flow peer-to-peer (WebRTC) — no media passes through this server.

module.exports = function (io) {
  const videoNS    = io.of("/video");
  const userSockets = {};   // userId -> socketId
  const activeCalls = {};   // callId -> { caller, callee, status }

  videoNS.on("connection", (socket) => {

    // ── Register user ────────────────────────────────────────
    socket.on("register", ({ userId, username }) => {
      userSockets[String(userId)] = socket.id;
      socket.userId   = String(userId);
      socket.username = username;
      console.log(`[Video] ${username} registered (socket ${socket.id})`);
    });

    // ── Caller: initiate a call ──────────────────────────────
    socket.on("callUser", ({ toUserId, fromUserId, fromUsername, offer }) => {
      const targetSocket = userSockets[String(toUserId)];
      if (!targetSocket) {
        socket.emit("callFailed", { reason: "User is offline or unavailable." });
        return;
      }

      const callId = `${fromUserId}-${toUserId}-${Date.now()}`;
      activeCalls[callId] = { caller: fromUserId, callee: toUserId, status: "ringing", callId };

      videoNS.to(targetSocket).emit("incomingCall", {
        callId,
        fromUserId,
        fromUsername,
        offer,
      });

      // Let caller know the ring went through
      socket.emit("callRinging", { callId, toUserId });
      socket.callId = callId;
    });

    // ── Callee: accept the call ──────────────────────────────
    socket.on("acceptCall", ({ callId, toUserId, answer }) => {
      const call = activeCalls[callId];
      if (!call) return;

      call.status = "connected";
      const callerSocket = userSockets[String(toUserId)];
      if (callerSocket) {
        videoNS.to(callerSocket).emit("callAccepted", { callId, answer });
      }
      socket.callId = callId;
    });

    // ── Callee: reject the call ──────────────────────────────
    socket.on("rejectCall", ({ callId, toUserId }) => {
      const call = activeCalls[callId];
      if (call) { call.status = "rejected"; delete activeCalls[callId]; }

      const callerSocket = userSockets[String(toUserId)];
      if (callerSocket) {
        videoNS.to(callerSocket).emit("callRejected", { callId });
      }
    });

    // ── ICE Candidate exchange ───────────────────────────────
    socket.on("iceCandidate", ({ toUserId, candidate }) => {
      const targetSocket = userSockets[String(toUserId)];
      if (targetSocket) {
        videoNS.to(targetSocket).emit("iceCandidate", { candidate, fromUserId: socket.userId });
      }
    });

    // ── End call ─────────────────────────────────────────────
    socket.on("endCall", ({ callId, toUserId }) => {
      if (activeCalls[callId]) delete activeCalls[callId];
      const targetSocket = userSockets[String(toUserId)];
      if (targetSocket) {
        videoNS.to(targetSocket).emit("callEnded", { callId });
      }
    });

    // ── Disconnect cleanup ───────────────────────────────────
    socket.on("disconnect", () => {
      if (socket.userId) {
        delete userSockets[socket.userId];

        // End any active call this socket was in
        if (socket.callId && activeCalls[socket.callId]) {
          const call = activeCalls[socket.callId];
          const otherId = String(call.caller) === socket.userId ? call.callee : call.caller;
          const otherSocket = userSockets[String(otherId)];
          if (otherSocket) {
            videoNS.to(otherSocket).emit("callEnded", { callId: socket.callId, reason: "other_disconnected" });
          }
          delete activeCalls[socket.callId];
        }
      }
    });
  });
};
