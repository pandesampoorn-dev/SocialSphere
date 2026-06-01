const socket = io("/dm");
const messagesDiv = document.getElementById("messagesDiv");
const dmInput     = document.getElementById("dmInput");
const dmSendBtn   = document.getElementById("dmSendBtn");
const typingDiv   = document.getElementById("typingIndicator");
let typingTimeout;

socket.emit("register", { userId: CURRENT_USER._id });

function scrollBottom() { messagesDiv.scrollTop = messagesDiv.scrollHeight; }
scrollBottom();

function sendDM() {
  const text = dmInput.value.trim();
  if (!text) return;
  socket.emit("sendDM", { toUserId: OTHER_USER._id, fromUserId: CURRENT_USER._id, body: text });
  dmInput.value = "";
  socket.emit("stopTyping", { toUserId: OTHER_USER._id });
  clearTimeout(typingTimeout);
}
dmSendBtn.addEventListener("click", sendDM);
dmInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendDM(); }
});
dmInput.addEventListener("input", function () {
  socket.emit("typing", { toUserId: OTHER_USER._id, username: CURRENT_USER.username });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit("stopTyping", { toUserId: OTHER_USER._id }), 1500);
});

socket.on("newDM", function ({ body, createdAt, fromMe }) {
  const notice = messagesDiv.querySelector(".text-center");
  if (notice) notice.remove();
  const time = new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const avatarHtml = !fromMe
    ? (OTHER_USER.avatar
        ? `<img src="${OTHER_USER.avatar}" class="rounded-circle me-2 flex-shrink-0" width="28" height="28" style="object-fit:cover">`
        : `<div class="avatar-xs me-2 flex-shrink-0">${OTHER_USER.username[0].toUpperCase()}</div>`)
    : "";
  const wrap = document.createElement("div");
  wrap.className = "d-flex mb-3" + (fromMe ? " justify-content-end" : "");
  wrap.innerHTML = `${!fromMe ? avatarHtml : ""}
    <div>
      <div class="chat-bubble ${fromMe ? "chat-bubble-own" : ""}">${escapeHtml(body)}</div>
      <div class="chat-meta ${fromMe ? "text-end" : ""}">${time}</div>
    </div>`;
  messagesDiv.appendChild(wrap);
  scrollBottom();
});

socket.on("typing", function ({ username }) {
  if (username !== CURRENT_USER.username) typingDiv.textContent = username + " is typing...";
});
socket.on("stopTyping", function () { typingDiv.textContent = ""; });
socket.on("dmError", function (msg) { alert(msg); });

function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
