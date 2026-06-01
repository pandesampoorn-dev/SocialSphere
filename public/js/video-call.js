// SocialSphere — WebRTC Video Call Client
// Signalling:  Socket.IO /video namespace
// Media:       Peer-to-peer via WebRTC (no media through server)

(function () {
  "use strict";

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const localVideo          = document.getElementById("localVideo");
  const remoteVideo         = document.getElementById("remoteVideo");
  const idleScreen          = document.getElementById("idleScreen");
  const idleText            = document.getElementById("idleText");
  const incomingCallOverlay = document.getElementById("incomingCallOverlay");
  const callerNameEl        = document.getElementById("callerName");
  const startCallBtn        = document.getElementById("startCallBtn");
  const endCallBtn          = document.getElementById("endCallBtn");
  const acceptBtn           = document.getElementById("acceptBtn");
  const rejectBtn           = document.getElementById("rejectBtn");
  const toggleMicBtn        = document.getElementById("toggleMicBtn");
  const toggleCamBtn        = document.getElementById("toggleCamBtn");
  const callStatusBadge     = document.getElementById("callStatusBadge");
  const callLog             = document.getElementById("callLog");

  // ── State ───────────────────────────────────────────────────────────────────
  let localStream   = null;
  let pc            = null;         // RTCPeerConnection
  let currentCallId = null;
  let inCall        = false;
  let micOn         = true;
  let camOn         = true;

  // Pending incoming call data (stored while showing the overlay)
  let pendingCall   = null;

  // ── STUN/TURN config ────────────────────────────────────────────────────────
  // Free Google STUN servers — works on local network and most NATs.
  // For production across firewalls, add a TURN server.
  const ICE_CONFIG = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };

  // ── Socket.IO (signalling) ──────────────────────────────────────────────────
  const socket = io("/video");

  socket.on("connect", () => {
    socket.emit("register", { userId: ME._id, username: ME.username });
    log("Connected to signalling server.");
  });

  // ── INCOMING CALL ────────────────────────────────────────────────────────────
  socket.on("incomingCall", async ({ callId, fromUserId, fromUsername, offer }) => {
    log(`Incoming call from @${fromUsername}`);
    pendingCall = { callId, fromUserId, fromUsername, offer };

    callerNameEl.textContent = "@" + fromUsername;
    incomingCallOverlay.classList.remove("d-none");
    incomingCallOverlay.classList.add("d-flex");
    setStatus("Incoming call…", "warning");
  });

  // ── CALLER: call is ringing ──────────────────────────────────────────────────
  socket.on("callRinging", ({ callId }) => {
    currentCallId = callId;
    log("Ringing…");
    setStatus("Ringing…", "warning");
  });

  // ── CALLER: callee accepted ──────────────────────────────────────────────────
  socket.on("callAccepted", async ({ callId, answer }) => {
    log("Call accepted! Connecting…");
    setStatus("Connecting…", "info");
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (e) {
      log("Error setting remote description: " + e.message);
    }
  });

  // ── ICE candidates from remote peer ─────────────────────────────────────────
  socket.on("iceCandidate", async ({ candidate }) => {
    if (!pc || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      // Non-fatal; some candidates arrive before remote desc is set
    }
  });

  // ── Call rejected ────────────────────────────────────────────────────────────
  socket.on("callRejected", ({ callId }) => {
    log("Call was declined.");
    setStatus("Declined", "danger");
    cleanupCall();
  });

  // ── Call ended ───────────────────────────────────────────────────────────────
  socket.on("callEnded", ({ callId }) => {
    log("Call ended.");
    setStatus("Call ended", "secondary");
    cleanupCall();
  });

  // ── Call failed (user offline) ───────────────────────────────────────────────
  socket.on("callFailed", ({ reason }) => {
    log("Call failed: " + reason);
    setStatus("Failed", "danger");
    cleanupCall();
  });

  // ── START CALL button ────────────────────────────────────────────────────────
  startCallBtn.addEventListener("click", async () => {
    if (inCall) return;
    try {
      await getLocalStream();
      await startCall();
    } catch (e) {
      log("Error: " + e.message);
    }
  });

  // ── ACCEPT button ────────────────────────────────────────────────────────────
  acceptBtn.addEventListener("click", async () => {
    if (!pendingCall) return;
    incomingCallOverlay.classList.add("d-none");
    incomingCallOverlay.classList.remove("d-flex");

    try {
      await getLocalStream();
      await acceptCall(pendingCall);
      pendingCall = null;
    } catch (e) {
      log("Error accepting call: " + e.message);
    }
  });

  // ── REJECT button ────────────────────────────────────────────────────────────
  rejectBtn.addEventListener("click", () => {
    if (!pendingCall) return;
    socket.emit("rejectCall", { callId: pendingCall.callId, toUserId: pendingCall.fromUserId });
    pendingCall = null;
    incomingCallOverlay.classList.add("d-none");
    incomingCallOverlay.classList.remove("d-flex");
    setStatus("Ready", "secondary");
    log("You declined the call.");
  });

  // ── END CALL button ──────────────────────────────────────────────────────────
  endCallBtn.addEventListener("click", () => {
    socket.emit("endCall", { callId: currentCallId, toUserId: OTHER._id });
    log("You ended the call.");
    setStatus("Call ended", "secondary");
    cleanupCall();
  });

  // ── TOGGLE MIC ───────────────────────────────────────────────────────────────
  toggleMicBtn.addEventListener("click", () => {
    if (!localStream) return;
    micOn = !micOn;
    localStream.getAudioTracks().forEach(t => { t.enabled = micOn; });
    toggleMicBtn.textContent = micOn ? "Mic On" : "Mic Off";
    toggleMicBtn.className   = micOn ? "btn btn-outline-secondary" : "btn btn-warning";
  });

  // ── TOGGLE CAMERA ────────────────────────────────────────────────────────────
  toggleCamBtn.addEventListener("click", () => {
    if (!localStream) return;
    camOn = !camOn;
    localStream.getVideoTracks().forEach(t => { t.enabled = camOn; });
    toggleCamBtn.textContent = camOn ? "Camera On" : "Camera Off";
    toggleCamBtn.className   = camOn ? "btn btn-outline-secondary" : "btn btn-warning";
  });

  // ── Core: get local camera + mic ─────────────────────────────────────────────
  async function getLocalStream() {
    if (localStream) return;
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    localVideo.style.display = "block";
    toggleMicBtn.disabled = false;
    toggleCamBtn.disabled = false;
    log("Camera and mic ready.");
  }

  // ── Core: Caller creates RTCPeerConnection and offer ─────────────────────────
  async function startCall() {
    pc = createPeerConnection();

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("callUser", {
      toUserId:     OTHER._id,
      fromUserId:   ME._id,
      fromUsername: ME.username,
      offer:        pc.localDescription,
    });

    inCall = true;
    startCallBtn.classList.add("d-none");
    endCallBtn.classList.remove("d-none");
    setStatus("Calling…", "warning");
    idleText.textContent = "Calling @" + OTHER.username + "…";
    log("Calling @" + OTHER.username + "…");
  }

  // ── Core: Callee creates RTCPeerConnection and answer ────────────────────────
  async function acceptCall({ callId, fromUserId, offer }) {
    currentCallId = callId;
    pc = createPeerConnection();

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("acceptCall", {
      callId,
      toUserId: fromUserId,
      answer:   pc.localDescription,
    });

    inCall = true;
    startCallBtn.classList.add("d-none");
    endCallBtn.classList.remove("d-none");
    setStatus("Connecting…", "info");
    log("Accepted. Establishing connection…");
  }

  // ── Core: build RTCPeerConnection with event handlers ───────────────────────
  function createPeerConnection() {
    const conn = new RTCPeerConnection(ICE_CONFIG);

    // Send ICE candidates to the other peer via signalling server
    conn.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket.emit("iceCandidate", { toUserId: OTHER._id, candidate });
      }
    };

    // When remote stream arrives, show it
    conn.ontrack = ({ streams }) => {
      if (streams && streams[0]) {
        remoteVideo.srcObject = streams[0];
        remoteVideo.style.display = "block";
        idleScreen.style.display  = "none";
        setStatus("In Call", "success");
        log("Connected! You are now in a call with @" + OTHER.username);
      }
    };

    conn.oniceconnectionstatechange = () => {
      log("ICE state: " + conn.iceConnectionState);
      if (conn.iceConnectionState === "failed") {
        log("Connection failed. Check your network.");
        setStatus("Failed", "danger");
      }
      if (conn.iceConnectionState === "disconnected") {
        log("Connection lost.");
        setStatus("Disconnected", "danger");
      }
    };

    conn.onconnectionstatechange = () => {
      if (conn.connectionState === "connected") {
        setStatus("In Call", "success");
      }
    };

    return conn;
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────
  function cleanupCall() {
    inCall        = false;
    currentCallId = null;
    pendingCall   = null;

    if (pc) { pc.close(); pc = null; }

    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }

    localVideo.srcObject  = null;
    remoteVideo.srcObject = null;
    localVideo.style.display  = "none";
    remoteVideo.style.display = "none";
    idleScreen.style.display  = "flex";
    idleText.textContent = 'Press "Start Call" to call this user';

    startCallBtn.classList.remove("d-none");
    endCallBtn.classList.add("d-none");
    toggleMicBtn.disabled = true;
    toggleCamBtn.disabled = true;
    toggleMicBtn.textContent = "Mic On";
    toggleCamBtn.textContent = "Camera On";
    toggleMicBtn.className = "btn btn-outline-secondary";
    toggleCamBtn.className = "btn btn-outline-secondary";

    micOn = true;
    camOn = true;

    incomingCallOverlay.classList.add("d-none");
    incomingCallOverlay.classList.remove("d-flex");
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function setStatus(text, color) {
    callStatusBadge.textContent = text;
    callStatusBadge.className = "badge bg-" + color;
  }

  function log(msg) {
    const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    callLog.innerHTML += `<span class="me-2 text-muted">[${t}]</span>${msg}<br>`;
    callLog.scrollTop = callLog.scrollHeight;
  }

})();
